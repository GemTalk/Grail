"Python list_iterator type.

An iterator over a list (OrderedCollection). Created by calling iter() on a list.

Instance variables:
  collection - the list being iterated over
  position - current position (0-based Python index)

"
Class {
	#name : 'list_iterator',
	#superclass : 'iterator',
	#instVars : [
		'collection',
		'position',
		'reverse',
		'exhausted'
	],
	#category : 'Grail-Collections-Iterators'
}
