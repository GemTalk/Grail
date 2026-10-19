"Python zip type: the LAZY iterator returned by zip(*iterables).

Each __next__ pulls one item from every source iterator and yields the
tuple; the first exhausted source stops the whole zip.  Laziness
matters: zip(count(), count(1)) over infinite sources must not
materialize (test_itertools OOM-killed the session when zip was eager).

Instance variables:
  sources - Array of underlying iterators (already __iter__-ed)
  strict  - true when zip(..., strict=True) demands equal lengths

"
Class {
	#name : 'zip_iterator',
	#superclass : 'iterator',
	#instVars : [
		'sources',
		'strict'
	],
	#category : 'Grail-Collections-Iterators'
}
