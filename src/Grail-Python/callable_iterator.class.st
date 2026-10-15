"CPython's callable_iterator (calliterobject): the iterator returned by the
two-argument form ``iter(callable, sentinel)'.  Each __next__ calls
``callable()' with no arguments and returns the result, UNTIL the result is
equal (Python ==) to the sentinel, at which point it raises StopIteration.

Exhaustion is latched (CPython clears it_callable): once the sentinel has been
seen -- or the callable raised StopIteration -- a spent iterator stays spent
and does NOT call the callable again.  The post-call re-check of ``exhausted'
covers gh-101892 (test_iter_function_concealing_reentrant_exhaustion): a
callable that re-entrantly exhausts THIS iterator mid-call must leave it spent,
so the value it finally returns is discarded and StopIteration is raised.

Instance variables:
  callable  - the zero-argument callable (a function, or an instance whose
              class defines __call__)
  sentinel  - the stop value; a returned value == sentinel ends iteration
  exhausted - latched true once StopIteration has been raised, so the spent
              iterator stays spent (matches CPython clearing it_callable)

"
Class {
	#name : 'callable_iterator',
	#superclass : 'iterator',
	#instVars : [
		'callable',
		'sentinel',
		'exhausted'
	],
	#category : 'Grail-Collections-Iterators'
}
