"Python tuple_iterator type.

An iterator over a tuple. Created by calling iter() on a tuple.

Instance variables:
  collection - the tuple being iterated over
  position - current position (0-based Python index)

"
Class {
	#name : 'tuple_iterator',
	#superclass : 'iterator',
	#instVars : [
		'collection',
		'position'
	],
	#category : 'Grail-Collections-Iterators'
}
