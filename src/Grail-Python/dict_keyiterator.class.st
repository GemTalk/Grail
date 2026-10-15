"Python dict_keyiterator type.

An iterator over dictionary keys. Created by calling iter() on a dict.

Instance variables:
  dict - the dictionary being iterated over (kept for reference)
  keys - array of keys from the dict (snapshot at creation)
  position - current position (0-based index)

"
Class {
	#name : 'dict_keyiterator',
	#superclass : 'iterator',
	#instVars : [
		'dict',
		'keys',
		'position',
		'startVersion'
	],
	#category : 'Grail-Collections-Iterators'
}
