import kanto from './kanto.json'
import johto from './johto.json'
import hoenn from './hoenn.json'
import sinnoh from './sinnoh.json'
import unova from './unova.json'

export const hiddenRegions = []
export const regions = [kanto, johto, hoenn, sinnoh, unova]
export const allRegions = [...hiddenRegions, ...regions]

export default { regions, hiddenRegions, allRegions }
