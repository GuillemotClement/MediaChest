/**
 * TEST UNITAIRE — media.service
 *
 * Objectif : vérifier la logique métier de `addMediaToUser` de façon isolée.
 *  - si le media existe déjà en base → on le réutilise
 *  - sinon → on le crée
 *  - puis on crée la relation media <-> utilisateur
 *
 * "Unitaire" = on ne teste QUE le service. Ses dépendances (le repository, donc
 * la base de données) sont remplacées par des faux ("mocks") dont on contrôle
 * les réponses. Le test est rapide, et il ne dépend ni de Postgres ni du réseau.
 */
import { describe, vi, expect, it } from 'vitest';
import * as mediaService from '../media.service.js';
import * as mediaRepository from '../media.repository.js';
import { ConflictError } from '../../../errors/index.js';

// TEST EXEMPLE -> a refaire

// vi.mock remplace TOUT le module par une version factice : chaque fonction
// exportée (findByTMDBId, createMedia, createMediaUser) devient un `vi.fn()` vide.
// - Le chemin doit être identique à celui de l'import ci-dessus.
// - Vitest "remonte" cet appel tout en haut du fichier (hoisting) : le mock est
//   donc en place AVANT que media.service.ts importe le repository.
// - Le vrai repository (et la connexion `db`) n'est jamais exécuté.
vi.mock('../media.repository.js');

// ---------------------------------------------------------------------------
// Données de test (fixtures) partagées entre les tests
// ---------------------------------------------------------------------------

// Ce que le controller envoie au service (le body validé par Zod).
// `as const` : force le type littéral 'film' (et non `string`) pour respecter
// l'enum mediaType attendu par le service.
const payload = { tmdbId: '550', name: 'Fight Club', mediaType: 'film' as const };

// Ce que la base renverrait pour un media existant (une ligne de la table `media`).
const existingMedia = { id: 1, ...payload, status: 'En attente' as const };

const now = new Date();

// Ce que la base renverrait après l'insertion dans la table `media_user`.
const mediaUser = {
  id: 10,
  userId: 'user-1',
  mediaId: 1,
  createdAt: now,
  updatedAt: now,
};

// `describe` regroupe les tests d'une même fonction ; `it` décrit UN comportement.
// Chaque test suit le schéma Arrange / Act / Assert :
//   1. Arrange : on configure ce que les mocks vont répondre
//   2. Act     : on appelle la fonction testée
//   3. Assert  : on vérifie le résultat et les appels effectués
//
// Entre chaque test, l'option `restoreMocks: true` (vitest.config.ts) remet les
// mocks à zéro : aucun test n'hérite des réponses ou des appels d'un autre.
describe('mediaService.addMediaToUser', () => {
  it('réutilise le media sans le recréer', async () => {
    // Arrange : le media est déjà en base…
    // `vi.mocked(fn)` : ne change rien à l'exécution, sert seulement à TypeScript
    // pour savoir que `fn` est un mock (accès à .mockResolvedValue, etc.).
    // `mockResolvedValue(x)` : la fonction async renverra une Promise résolue avec x.
    vi.mocked(mediaRepository.findByTMDBId).mockResolvedValue(existingMedia);
    // …et la création de la relation réussit.
    vi.mocked(mediaRepository.createMediaUser).mockResolvedValue(mediaUser);

    // Act
    const result = await mediaService.addMediaToUser('user-1', payload);

    // Assert : le media existant n'a pas été recréé…
    expect(mediaRepository.createMedia).not.toHaveBeenCalled();
    // …la relation a été créée avec le bon utilisateur et l'id du media existant…
    expect(mediaRepository.createMediaUser).toHaveBeenCalledWith('user-1', 1);
    // …et le service renvoie la réponse attendue (toEqual = égalité profonde).
    expect(result).toEqual({
      mediaId: 1,
      mediaTmdbId: '550',
      mediaName: 'Fight Club',
      userId: 'user-1',
    });
  });

  it('crée le media lorsqu’il n’existe pas', async () => {
    // Arrange : aucun media trouvé en base (findByTMDBId renvoie undefined)…
    vi.mocked(mediaRepository.findByTMDBId).mockResolvedValue(undefined);
    // …donc le service doit le créer : on simule la ligne renvoyée par l'insertion.
    vi.mocked(mediaRepository.createMedia).mockResolvedValue(existingMedia);
    vi.mocked(mediaRepository.createMediaUser).mockResolvedValue(mediaUser);

    // Act
    await mediaService.addMediaToUser('user-1', payload);

    // Assert : createMedia a bien été appelé, avec les arguments dans le bon ordre
    // (tmdbId, mediaType, name) — c'est la signature du repository.
    expect(mediaRepository.createMedia).toHaveBeenCalledWith('550', 'film', 'Fight Club');
  });

  it('propage le conflit si l’utilisateur possède déjà le media', async () => {
    // Arrange : le media existe…
    vi.mocked(mediaRepository.findByTMDBId).mockResolvedValue(existingMedia);
    // …mais la relation existe déjà : le repository lève une ConflictError
    // (c'est ce qu'il fait réellement sur une violation d'unicité Postgres 23505).
    // `mockRejectedValue(err)` : la fonction renverra une Promise rejetée avec err.
    vi.mocked(mediaRepository.createMediaUser).mockRejectedValue(new ConflictError());

    // Act + Assert : le service ne doit PAS avaler l'erreur, il doit la laisser
    // remonter au controller (qui la passera à Express → réponse 409).
    // `.rejects` attend que la Promise échoue, puis vérifie le type de l'erreur.
    await expect(mediaService.addMediaToUser('user-1', payload)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});
