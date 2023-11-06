import { addClass, constructors } from './constructors.js'

import { Chrono, Anim, AnimField, AnimFrame, AnimTarget, PhysField } from './Anim.js'
import { IsoTriangleEntity, RightTriangleEntity, OvalEntity } from './BasicEntity.js'
import { Camera } from './Camera.js'
import { Entity } from './Entity.js'
import { GridArea } from './GridArea.js'
import { Line } from './Line.js'
import { Material } from './Material.js'
import { FuncCall } from './serialization.js'
import { Shape } from './Shape.js'
import { Sound } from './Sound.js'
import { TileArray } from './TileArray.js'
import { Vec2 } from './Vec2.js'

export let empty = 0; // export so that webpack doesn't ignore the file

addClass( 'Vec2', Vec2 ); // no loops
addClass( 'Material', Material ); // no loops
addClass( 'Line', Line ); // no loops
addClass( 'Shape', Shape ); // could loop via .parent but currently not stored by parent
addClass( 'Entity', Entity ); // no loops
addClass( 'GridArea', GridArea );
addClass( 'TileArray', TileArray );
addClass( 'Anim', Anim );
addClass( 'AnimField', AnimField );
addClass( 'AnimFrame', AnimFrame );
addClass( 'Chrono', Chrono );
addClass( 'PhysField', PhysField );
addClass( 'Sound', Sound );
addClass( 'Camera', Camera );
addClass( 'AnimTarget', AnimTarget );
addClass( 'IsoTriangleEntity', IsoTriangleEntity );
addClass( 'RightTriangleEntity', RightTriangleEntity );
addClass( 'OvalEntity', OvalEntity );
addClass( 'FuncCall', FuncCall );

// define special constructors here
// constructors[className] =  () => new Class( false );