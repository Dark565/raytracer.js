
/** Get a type-unique ID of an object */
export function unique_object_id(obj: any): number {
	if (obj.__uniqueid != undefined)
		return obj.__uniqueid as number;

	const ctor = obj.constructor;
	ctor.__uniqueid_current ??= 0;
	return obj.__uniqueid = ctor.__uniqueid_current++;
}
