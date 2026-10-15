"Python filter type: the LAZY iterator returned by filter(func, iterable).

Pulls from the source iterator on demand, keeping items for which
func(item) is truthy (or the item itself is truthy when func is None).
Laziness matters: filter(pred, itertools.count()) over an infinite
source must not materialize (test_itertools OOM-killed the session
when filter was eager).

Instance variables:
  func   - the predicate (a callable, or None for truthiness)
  source - the underlying iterator (already __iter__-ed)

"
Class {
	#name : 'filter_iterator',
	#superclass : 'iterator',
	#instVars : [
		'func',
		'source'
	],
	#category : 'Grail-Collections-Iterators'
}
