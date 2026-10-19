"Python enumerate type: the LAZY iterator returned by enumerate(iterable,
start=0), yielding (index, item) pairs.

A TYPE and not merely a function, as in CPython.  That distinction is
load-bearing rather than cosmetic: ``class MyEnum(enumerate)' needs a class
to subclass, ``type(enumerate(s)) is enumerate' is what test_enumerate
checks first, and the pickle round trip has to rebuild the same type.  While
enumerate was a builtins METHOD returning a materialized list_iterator, none
of those held -- and the class statement raised NameError, which is where
test.test_enumerate stopped at import.

Laziness matters for the same reason it does in zip_iterator: the source is
pulled one item at a time, so enumerate(count()) does not hang and an
exception raised by the source's __next__ surfaces when it is reached
rather than at construction (test_exception_propagation).

Instance variables:
  source - the underlying iterator (already iter()-ed)
  index  - the number to pair with the NEXT item

"
Class {
	#name : 'enumerate',
	#superclass : 'iterator',
	#instVars : [
		'source',
		'index'
	],
	#category : 'Grail-Collections-Iterators'
}
