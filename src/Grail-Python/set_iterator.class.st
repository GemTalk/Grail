"Python set_iterator type.

An iterator over a set or frozenset (Set). Created by calling iter() on a set/frozenset.

Since GemStone Sets don't have indexed access, we convert the set to an array
of elements when the iterator is created, then iterate over that array.

Instance variables:
  collection - the set/frozenset being iterated over (kept for reference)
  elements - array of elements from the set (created at initialization)
  position - current position (0-based Python index)

"
Class {
	#name : 'set_iterator',
	#superclass : 'iterator',
	#instVars : [
		'collection',
		'elements',
		'position'
	],
	#category : 'Grail-Collections-Iterators'
}
