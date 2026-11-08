import ButtonDisplayChoice from './components/ButtonChoice';
import DisplaySerie from './components/display/DisplaySerie';
import DisplayMovie from './components/display/DisplayMovie';
import { useState } from 'react';

const displayTitles = {
  populare_movie: 'Films populaires',
  populare_serie: 'Séries populaire',
  my_media: 'Ma liste',
};

type Display = keyof typeof displayTitles;

export default function Homepage() {
  const [display, setDisplay] = useState<Display>('populare_movie');

  return (
    <div className="">
      <div className="border border-gray-300 bg-white rounded p-5 my-10">
        <h2 className="text-3xl mt-3 mb-5 font-bold">{displayTitles[display]}</h2>

        <div className="flex gap-x-3">
          <ButtonDisplayChoice
            text="Films populaire"
            setChoice={() => setDisplay('populare_movie')}
            color="btn-primary"
          />

          <ButtonDisplayChoice
            text="Séries populaire"
            setChoice={() => setDisplay('populare_serie')}
            color="btn-error"
          />

          <ButtonDisplayChoice
            text="Ma liste"
            setChoice={() => setDisplay('my_media')}
            color=""
          />
        </div>
      </div>

      {display === 'populare_serie' && <DisplaySerie />}
      {display === 'populare_movie' && <DisplayMovie />}
    </div>
  );
}
