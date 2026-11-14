/**
 * TEST DES ENDPOINTS — POST /api/media/add-media-to-user
 *
 * Objectif : vérifier que l'endpoint répond correctement côté HTTP
 * (codes de statut, body de réponse, validation, authentification).
 *
 * On envoie de vraies requêtes HTTP au VRAI `app` Express grâce à supertest.
 * La requête traverse donc toute la chaîne réelle :
 *
 *   requireAuth → express.json → router → validateBody (Zod) → controller → service
 *
 * Pour ne pas avoir besoin d'une base de données, on remplace (mock) deux modules :
 *   - lib/auth.js        → on décide si l'utilisateur est connecté ou non
 *   - media.service.js   → on décide ce que le service renvoie (succès / erreur)
 *
 * Tout le reste (middlewares, router, schéma Zod, controller) est le vrai code.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
// supertest : envoie des requêtes HTTP à l'app sans démarrer de serveur (pas de app.listen).
import request from 'supertest';
import { app } from '../../../app.js';
// Ces deux imports renvoient les versions MOCKÉES (voir vi.mock plus bas) :
// on s'en sert pour configurer les réponses et vérifier les appels.
import { auth } from '../../../lib/auth.js';
import * as mediaService from '../media.service.js';
import { ConflictError } from '../../../errors/index.js';

// ---------------------------------------------------------------------------
// Mocks : aucune base de données n'est touchée
// ---------------------------------------------------------------------------
// Rappel : Vitest remonte les vi.mock tout en haut du fichier (hoisting). Ils
// s'appliquent donc AVANT l'import de `app`, qui charge ces modules en cascade.

// Better Auth : on fournit une "factory" (la fonction en 2e argument) qui
// définit à la main ce que le module exporte. Il faut seulement ce que l'app utilise :
//  - auth.api.getSession → appelé par le middleware requireAuth
//  - auth.handler        → utilisé par toNodeHandler(auth) dans app.ts
// Sans ce mock, getSession interrogerait la base pour retrouver la session.
vi.mock('../../../lib/auth.js', () => ({
  auth: {
    api: { getSession: vi.fn() },
    handler: vi.fn(),
  },
}));

// Service : mock automatique (sans factory), chaque export devient un vi.fn().
// On teste la couche HTTP seule ; la logique du service a son propre test unitaire.
vi.mock('../media.service.js');

// ---------------------------------------------------------------------------
// Données de test
// ---------------------------------------------------------------------------
const ENDPOINT = '/api/media/add-media-to-user';

// Un body qui respecte le schéma Zod `addMediaToUserRequest`.
const validBody = { tmdbId: '550', name: 'Fight Club', mediaType: 'film' };

// Ce que Better Auth renverrait pour un utilisateur connecté.
// requireAuth copie `user` dans req.user, et le controller lit req.user.id.
const fakeSession = {
  user: { id: 'user-1', email: 'test@mail.com', name: 'test' },
  session: { id: 'session-1', userId: 'user-1' },
};

// Ce que le service mocké renvoie en cas de succès.
const serviceResponse = {
  mediaId: 1,
  mediaTmdbId: '550',
  mediaName: 'Fight Club',
  userId: 'user-1',
};

// Petit helper : simule un utilisateur connecté.
// Le cast est nécessaire parce que le vrai type de session Better Auth contient
// beaucoup plus de champs que notre faux objet (dates, token, ipAddress…).
const loggedIn = () =>
  vi.mocked(auth.api.getSession).mockResolvedValue(
    fakeSession as Awaited<ReturnType<typeof auth.api.getSession>>,
  );

describe(`POST ${ENDPOINT}`, () => {
  // beforeEach s'exécute avant CHAQUE test de ce describe (et des describe imbriqués).
  // Par défaut, le service répond avec succès ; un test peut écraser ce comportement.
  // (Les mocks sont remis à zéro entre les tests grâce à `restoreMocks: true`.)
  beforeEach(() => {
    vi.mocked(mediaService.addMediaToUser).mockResolvedValue(serviceResponse);
  });

  // -------------------------------------------------------------------------
  describe('authentification', () => {
    it('renvoie 401 sans session', async () => {
      // getSession renvoie null = aucun cookie de session valide.
      vi.mocked(auth.api.getSession).mockResolvedValue(null);

      // .send() envoie le body en JSON ; .expect(401) fait échouer le test si le
      // statut HTTP est différent.
      await request(app).post(ENDPOINT).send(validBody).expect(401);

      // La requête doit être bloquée par requireAuth, avant d'atteindre le service.
      expect(mediaService.addMediaToUser).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('succès', () => {
    // Tous les tests de ce bloc s'exécutent avec un utilisateur connecté.
    beforeEach(loggedIn);

    it('renvoie 201 avec le media créé', async () => {
      const res = await request(app).post(ENDPOINT).send(validBody).expect(201);

      // res.body = la réponse JSON déjà parsée par supertest.
      // Le controller doit renvoyer tel quel ce que le service retourne.
      expect(res.body).toEqual(serviceResponse);
    });

    it("transmet l'id de session et le body validé au service", async () => {
      await request(app)
        .post(ENDPOINT)
        // name avec des espaces + un champ non prévu dans le schéma
        .send({ ...validBody, name: '  Fight Club  ', extra: 'ignoré' })
        .expect(201);

      // On vérifie le travail des middlewares :
      //  - le userId vient de la session (req.user.id), pas du body
      //  - validateBody a remplacé req.body par la version parsée par Zod :
      //    `.trim()` a retiré les espaces et z.object a supprimé le champ `extra`
      expect(mediaService.addMediaToUser).toHaveBeenCalledWith('user-1', validBody);
    });
  });

  // -------------------------------------------------------------------------
  describe('validation du body', () => {
    beforeEach(loggedIn);

    // it.each : lance le MÊME test avec plusieurs jeux de données.
    // Chaque ligne = [libellé, body envoyé, champs qui doivent être en erreur].
    // Le `%s` du titre est remplacé par le libellé (1er élément de la ligne).
    it.each([
      ['body vide', {}, ['name', 'tmdbId', 'mediaType']],
      ['name vide après trim', { ...validBody, name: '   ' }, ['name']],
      ['tmdbId manquant', { name: 'Fight Club', mediaType: 'film' }, ['tmdbId']],
      ['mediaType inconnu', { ...validBody, mediaType: 'anime' }, ['mediaType']],
      ['mauvais type', { ...validBody, tmdbId: 550 }, ['tmdbId']],
    ])('renvoie 400 si %s', async (_label, body, invalidFields) => {
      const res = await request(app).post(ENDPOINT).send(body).expect(400);

      // Format de réponse défini dans validateBody (middlewares/validationRequest.ts).
      expect(res.body.error).toBe('Invalid data');
      // `details` vient de z.flattenError(...).fieldErrors :
      // un objet { nomDuChamp: ['message d'erreur'] } avec uniquement les champs invalides.
      // On trie les deux listes pour que l'ordre des clés n'ait pas d'importance.
      expect(Object.keys(res.body.details).sort()).toEqual([...invalidFields].sort());
      // Une requête invalide ne doit jamais atteindre le service.
      expect(mediaService.addMediaToUser).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('erreurs métier', () => {
    beforeEach(loggedIn);

    it("renvoie 409 si l'utilisateur possède déjà le media", async () => {
      // On écrase le comportement par défaut : cette fois, le service échoue.
      vi.mocked(mediaService.addMediaToUser).mockRejectedValue(new ConflictError());

      // Le controller attrape l'erreur et la passe à next(error). Comme le
      // gestionnaire d'erreurs de app.ts est commenté, c'est celui d'Express qui
      // répond, en utilisant la propriété `status` (409) de AppError.
      // NB : le body est alors du HTML, d'où la vérification du statut seulement.
      await request(app).post(ENDPOINT).send(validBody).expect(409);
    });
  });
});

// ---------------------------------------------------------------------------
describe('routes inconnues', () => {
  it('renvoie 404', async () => {
    // Connecté, sinon requireAuth répondrait 401 avant d'arriver au handler 404.
    loggedIn();

    // Le dernier middleware de app.ts transforme toute route non trouvée en
    // EndpointNotFoundError (status 404).
    await request(app).get('/api/media/does-not-exist').expect(404);
  });
});
