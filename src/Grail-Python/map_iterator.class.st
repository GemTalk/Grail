"Python map type: the LAZY iterator returned by map(func, *iterables).

Pulls one item from EACH source per __next__ and applies func to all of
them, matching CPython's multi-iterable map() (stops at the shortest
source).  Laziness matches CPython (map over an infinite iterator must
not materialize) -- map() used to answer an eager LIST, which also let
non-Python code index the result; callers relying on that were bugs
by Python semantics and have been updated.

Instance variables:
  func    - the mapping callable
  sources - an Array of the underlying iterators (already __iter__-ed)

"
Class {
	#name : 'map_iterator',
	#superclass : 'iterator',
	#instVars : [
		'func',
		'sources',
		'strict'
	],
	#category : 'Grail-Collections-Iterators'
}
