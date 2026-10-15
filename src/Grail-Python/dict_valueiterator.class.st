"Python dict_valueiterator type.

An iterator over dictionary values. Created by calling iter() on dict.values().

Instance variables:
  dict - the dictionary being iterated over (kept for reference)
  values - array of values from the dict (snapshot at creation)
  position - current position (0-based index)

"
Class {
	#name : 'dict_valueiterator',
	#superclass : 'iterator',
	#instVars : [
		'dict',
		'values',
		'position',
		'startVersion'
	],
	#category : 'Grail-Collections-Iterators'
}
