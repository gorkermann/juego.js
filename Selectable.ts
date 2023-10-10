import { Vec2 } from './Vec2.js'

export type Selectable<Type> = {
	className: string;

	hovered: boolean;
	preselected: boolean;
	selected: boolean;

	removeThis: boolean;

	hover: ( p: Vec2 ) => Array<Type>;
	select: () => void;
	unselect: () => void;
}