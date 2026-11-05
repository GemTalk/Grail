"Python's reversed type: the iterator reversed(x) answers for a sequence
with no __reversed__ of its own -- a tuple, a str, bytes, a user class with
__len__ and __getitem__ -- walking an index DOWN from len(x) - 1
(Objects/enumobject.c, PyReversed_Type).  builtins binds it as reversed, so
``isinstance(r, reversed)'' and ``class R(reversed)'' work as in CPython.

The starting index is taken once, at the call; a sequence that later changes
length keeps it.

Instance variables:
  source    - the sequence being walked, by __getitem__
  index     - the next index to fetch; below 0 once the walk is done
  exhausted - latched once the walk ends, as CPython clears its seq: the
              iterator then stays spent, hints 0 and reduces to
              ``(reversed, ((),))''
"
Class {
	#name : 'reversed_iterator',
	#superclass : 'iterator',
	#instVars : [
		'source',
		'index',
		'exhausted'
	],
	#category : 'Grail-Collections-Iterators'
}
