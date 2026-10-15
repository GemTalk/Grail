"Python str_iterator type.

An iterator over a string (Unicode7). Created by calling iter() on a string.
Returns one character at a time as a single-character string.

Instance variables:
  collection - the string being iterated over
  position - current position (0-based Python index)

"
Class {
	#name : 'str_iterator',
	#superclass : 'iterator',
	#instVars : [
		'collection',
		'position'
	],
	#category : 'Grail-Collections-Iterators'
}
