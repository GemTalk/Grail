"Python dict_itemiterator type.

An iterator over dictionary items (key-value pairs). Created by calling iter() on dict.items().

Instance variables:
  dict - the dictionary being iterated over (kept for reference)
  items - array of (key, value) tuples from the dict (snapshot at creation)
  position - current position (0-based index)

"
Class {
	#name : 'dict_itemiterator',
	#superclass : 'iterator',
	#instVars : [
		'dict',
		'items',
		'position',
		'startVersion'
	],
	#category : 'Grail-Collections-Iterators'
}
