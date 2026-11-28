import GameTable from "../../components/game-table";
import SeoJsonLd from "../../components/seo-json-ld";
import {routeMetadata, gameSchema} from "../../lib/seo";
export const metadata=routeMetadata("/play");
export default function PlayPage(){return <><SeoJsonLd data={gameSchema}/><GameTable/></>;}
