"Python range_iterator type.

An iterator over a range (Interval). Created by calling iter() on a range.

Instance variables:
  collection - the range being iterated over
  position - current position (0-based Python index)

"
Class {
	#name : 'range_iterator',
	#superclass : 'iterator',
	#instVars : [
		'collection',
		'position'
	],
	#category : 'Grail-Collections-Iterators'
}
