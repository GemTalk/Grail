"reversed(d), reversed(d.keys()) for a PyDict -- and, through its two
subclasses, reversed(d.values()) and reversed(d.items()).

A port of CPython's dictreviter_iternext, so mutation during iteration has
CPython's outcome rather than a snapshot's.  The iterator holds a POSITION
in the dict's entry list -- PyDict's ``order', which keeps a nil where a key
was deleted, as CPython's entries array does -- and a count of the items it
still expects.  Each step walks back from the position past deleted entries.
A size change raises ``dictionary changed size during iteration'; finding an
entry once the count is spent raises ``dictionary keys changed during
iteration' (3.14.8, gh-158254); running off the start just ends the
iteration, even with items still expected -- which is what a clear() and
refill under a live iterator does (test_reversed_dict_after_clear_and_restore).

Instance variables:
  dict -- the PyDict, or nil once the iteration has ended (it stays ended)
  pos  -- 1-based index in the order list of the next entry to consider
  len  -- items still expected
  used -- the dict's size at creation; -1 after a size change, which keeps
          raising, as CPython's does"
Class {
	#name : 'dict_reversekeyiterator',
	#superclass : 'iterator',
	#instVars : [
		'dict',
		'pos',
		'len',
		'used'
	],
	#category : 'Grail-Collections-Iterators'
}

{ #category : 'Grail-Instance Creation' }
dict_reversekeyiterator class >> ___on: aPyDict [
	^ self @env1:___new___ ___initOn: aPyDict

]

{ #category : 'Grail-Copying' }
dict_reversekeyiterator >> ___copyState___ [
	^ self copy

]

{ #category : 'Grail-Initialization' }
dict_reversekeyiterator >> ___initOn: aPyDict [
	dict := aPyDict.
	used := aPyDict size.
	len := used.
	pos := aPyDict ___order___ size.
	^ self

]

{ #category : 'Grail-Iteration' }
dict_reversekeyiterator >> ___produce___: aKey [
	"What one step yields for the entry aKey."

	^ aKey

]

{ #category : 'Grail-Iteration' }
dict_reversekeyiterator >> ___step___ [
	"The next entry's key, or nil at the end.  dictreviter_iter_lock_held."

	| order i key |
	dict == nil ifTrue: [^ nil].
	used = dict size ifFalse: [
		used := -1.
		^ RuntimeError @env1:___signal___: 'dictionary changed size during iteration'].
	order := dict ___order___.
	i := pos.
	(i < 1 or: [i > order size]) ifTrue: [dict := nil. ^ nil].
	[(key := order at: i) == nil] whileTrue: [
		i := i - 1.
		i < 1 ifTrue: [dict := nil. ^ nil]].
	len = 0 ifTrue: [
		dict := nil.
		^ RuntimeError @env1:___signal___: 'dictionary keys changed during iteration'].
	pos := i - 1.
	len := len - 1.
	^ key

]
