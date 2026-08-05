! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- seq_iterator class (Python legacy __getitem__ sequence iterator)
expectvalue /Class
doit
iterator subclass: 'seq_iterator'
  instVarNames: #( source index exhausted)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
seq_iterator comment:
'CPython''s legacy sequence iterator (PySeqIter): the LAZY iterator returned
by iter(x) when x defines __getitem__ but no __iter__.  Each __next__ calls
x.__getitem__(index) with the next integer index (from 0) and stops on
IndexError.

Laziness matches CPython -- an object whose __getitem__ returns a value for
EVERY index (an unbounded sequence) must NOT be materialized.  The former
eager PythonInstance>>__iter__ walked __getitem__ into an OrderedCollection
until IndexError, which spun forever and OOM-killed the session on such a
class (test_iter''s NoIterClass / UnlimitedSequenceClass).

Instance variables:
  source    - the object being iterated (its __getitem__: supplies items)
  index     - the next integer index to fetch (0-based, a Smalltalk Integer)
  exhausted - latched true once __getitem__ raised IndexError, so a spent
              iterator stays spent (matches CPython clearing it_seq and the
              list_iterator latch) and does not re-probe __getitem__
'
%

expectvalue /Class
doit
seq_iterator category: 'Grail-Collections-Iterators'
%

expectvalue /Metaclass3
doit
seq_iterator removeAllMethods: 1.
seq_iterator class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: seq_iterator
___on: aSequence
	"Create a lazy sequence iterator over aSequence's __getitem__."

	| instance |
	instance := self ___new___.
	instance ___source: aSequence.
	^ instance
%

category: 'Grail-Private'
method: seq_iterator
___source: aSequence
	source := aSequence.
	index := 0.
	exhausted := false
%

category: 'Grail-Iterator Protocol'
method: seq_iterator
__next__
	"Fetch source[index]; a raised IndexError means the sequence is
	exhausted (CPython maps it to StopIteration and latches it_seq = NULL).
	Any OTHER exception from __getitem__ propagates unchanged, matching
	CPython (e.g. a __getitem__ that raises ValueError)."

	| v |
	exhausted @env0:ifTrue: [StopIteration @env0:signal].
	v := [source __getitem__: index]
		@env0:on: IndexError
		do: [:ex | ex @env0:return: #'___seqIterStop___'].
	(v @env0:== #'___seqIterStop___') @env0:ifTrue: [
		exhausted := true.
		StopIteration @env0:signal].
	index := index @env0:+ 1.
	^ v
%

category: 'Grail-Iterator Protocol'
method: seq_iterator
__length_hint__
	"Items not yet produced -- CPython's iter_len (iterobject.c).  The source
	is only known to answer __getitem__; when it has no __len__ there is no
	count to report and CPython answers the NotImplemented singleton, which
	operator.length_hint turns into the caller's default.  (The singleton is
	looked up rather than named directly, the same defensive pattern the
	binary-op protocol in Object.gs uses.)"

	| ni n |
	exhausted @env0:ifTrue: [^ 0].
	((source @env0:class @env0:whichClassIncludesSelector: #'__len__' environmentId: 1)
		@env0:isNil) ifFalse: [
		n := source __len__.
		^ (n @env0:- index) @env0:max: 0].
	ni := Python @env0:at: #NotImplemented otherwise: nil.
	ni @env0:isNil ifTrue: [^ 0].
	^ ni
%

category: 'Grail-Pickle Protocol'
method: seq_iterator
__setstate__: aState
	"Set the next index (CPython PySeqIter __setstate__), clamping a
	negative state to 0 -- test_iter's test_iter_neg_setstate:
	``it.__setstate__(-42)'' then next(it) yields 0, 1, ...  A no-op once
	exhausted (CPython leaves a spent iterator spent)."

	exhausted @env0:ifTrue: [^ self].
	index := (aState @env0:< 0) @env0:ifTrue: [0] @env0:ifFalse: [aState].
	^ self
%

category: 'Grail-Instance Creation'
classmethod: seq_iterator
_new_from: aSource _: idx
	"Reconstruct a seq_iterator with an explicit (source, index) state --
	the pickle round-trip (pickle.py's ``Q'' tag).  exhausted is re-derived:
	idx may point one past the end, and the next __next__ re-latches on the
	IndexError, matching CPython's seqiterator __reduce__ (iter, (seq,), idx)."

	| instance |
	instance := self ___new___.
	instance ___setState: aSource _: idx.
	^ instance
%

category: 'Grail-Private'
method: seq_iterator
___setState: aSource _: idx
	source := aSource.
	index := idx.
	exhausted := false
%

category: 'Grail-Pickle Protocol'
method: seq_iterator
_getstate
	"Answer (source, index) for pickling, so pickle.py reduces a LIVE iterator
	to (iter, (source,), index) -- it keeps a reference to source, so extending
	source later extends the iteration (test_mutating_seq_class_iter_pickle's
	initial/running/empty cases).

	A SPENT iterator is different: CPython clears it_seq on exhaustion and its
	__reduce__ becomes (iter, ((),)) -- an empty tuple, NOT source -- so a
	reloaded spent iterator yields nothing and mutating the original sequence
	cannot revive it (the same test's exhausted case; without this it resumed at
	its old index and, once source had grown, wrongly produced more values).
	Answering ((), 0) makes pickle.py emit iter(()), reloading as a spent
	iterator over an empty tuple -- the test checks only isinstance(Iterator)
	there, not the exact type, matching CPython (which also reloads as iter(())).

	A plain Python-visible method (no ___ prefix) so pickle.py can call it, the
	same convention as list_iterator/tuple_iterator _getstate."

	exhausted @env0:ifTrue: [^ tuple @env0:withAll: { (tuple @env0:withAll: { }). 0 }].
	^ tuple @env0:withAll: { source. index }
%

set compile_env: 0
