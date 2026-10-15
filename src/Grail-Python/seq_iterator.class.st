"CPython's legacy sequence iterator (PySeqIter): the LAZY iterator returned
by iter(x) when x defines __getitem__ but no __iter__.  Each __next__ calls
x.__getitem__(index) with the next integer index (from 0) and stops on
IndexError.

Laziness matches CPython -- an object whose __getitem__ returns a value for
EVERY index (an unbounded sequence) must NOT be materialized.  The former
eager PythonInstance>>__iter__ walked __getitem__ into an OrderedCollection
until IndexError, which spun forever and OOM-killed the session on such a
class (test_iter's NoIterClass / UnlimitedSequenceClass).

Instance variables:
  source    - the object being iterated (its __getitem__: supplies items)
  index     - the next integer index to fetch (0-based, a Smalltalk Integer)
  exhausted - latched true once __getitem__ raised IndexError, so a spent
              iterator stays spent (matches CPython clearing it_seq and the
              list_iterator latch) and does not re-probe __getitem__
  reverse   - walking DOWN from len(source)-1 rather than up from 0, which is
              what reversed(x) needs for an old-style sequence.  CPython gives
              that its own type (PyReversed_Type); the two differ only in
              direction, so one class carries both, as list_iterator already
              does for iter(list)/reversed(list)

"
Class {
	#name : 'seq_iterator',
	#superclass : 'iterator',
	#instVars : [
		'source',
		'index',
		'exhausted',
		'reverse'
	],
	#category : 'Grail-Collections-Iterators'
}
