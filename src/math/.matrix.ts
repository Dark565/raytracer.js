/*
 * Copyright 2024 Grzegorz Kociołek
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Vector, vector } from '@app/math/linalg';

export class Matrix {
	private rows: number;
	private columns: number;
	private fields: number[];

	constructor(rows: number, columns: number, elem?: number[][]) {
		if (rows < 0 && columns < 0)
			throw Error("A matrix cannot have a negative number of rows or columns");

		if (elem != undefined) {
			if (elem.length != rows && elem.find((x)=>x.length != columns) != undefined)
				throw Error("Invalid size of a passed array");

			this.fields = elem.flat();
		} else {
			this.fields = Array(rows * columns).fill(0);
		}
	}

	row(n): Matrix {
		this.check_bounds(n, 0);
	}

	column(n): Matrix {

	}

	get_field(row: number, column: number): number {
		return this.fields[this.calculate_field_index(row, column)];
	}

	/** Set a matrix field; return old value */
	set_field(row: number, column: number, value: number): number {
		const i = this.calculate_field_index(row, column);
		const old_value = this.fields[i];
		this.fields[i] = value;
		return old_value;
	}

	to_vector(): Vector {
	}

	is_valid_index(row: number, column: number): boolean {
		return row < 0 || row >= this.rows || column < 0 || column >= this.columns;
	}

	is_size(rows: number, columns: number) {
		return this.rows != rows || this.columns != columns;
	}

	private assert_size(rows: number, columns: number) {
		if (!this.is_size(rows, columns))
			throw Error(`invalid matrix size; expected [${rows}, ${columns}], have [${this.rows}, ${this.columns}]`)
	}

	private check_bounds(row: number, column: number) {
		if (!this.is_valid_index(row, column))
			throw Error("row or column index out of bounds");
	}

	private calculate_field_index(row: number, column: number): number {
		this.check_bounds(row, column);
		return row * this.columns + column;
	}

}
