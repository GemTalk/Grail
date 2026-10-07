! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- dict_reversekeyiterator / dict_reversevalueiterator /
! ------- dict_reverseitemiterator (Python types of the same names)
expectvalue /Class
doit
iterator subclass: 'dict_reversekeyiterator'
  instVarNames: #( dict pos len used)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
dict_reversekeyiterator comment:
'reversed(d), reversed(d.keys()) for a PyDict -- and, through its two
subclasses, reversed(d.values()) and reversed(d.items()).

A port of CPython''s dictreviter_iternext, so mutation during iteration has
CPython''s outcome rather than a snapshot''s.  The iterator holds a POSITION
in the dict''s entry list -- PyDict''s ``order'', which keeps a nil where a key
was deleted, as CPython''s entries array does -- and a count of the items it
still expects.  Each step walks back from the position past deleted entries.
A size change raises ``dictionary changed size during iteration''; finding an
entry once the count is spent raises ``dictionary keys changed during
iteration'' (3.14.8, gh-158254); running off the start just ends the
iteration, even with items still expected -- which is what a clear() and
refill under a live iterator does (test_reversed_dict_after_clear_and_restore).

Instance variables:
  dict -- the PyDict, or nil once the iteration has ended (it stays ended)
  pos  -- 1-based index in the order list of the next entry to consider
  len  -- items still expected
  used -- the dict''s size at creation; -1 after a size change, which keeps
          raising, as CPython''s does'
%

expectvalue /Class
doit
dict_reversekeyiterator category: 'Grail-Collections-Iterators'
%

expectvalue /Class
doit
dict_reversekeyiterator subclass: 'dict_reversevalueiterator'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
dict_reversevalueiterator category: 'Grail-Collections-Iterators'
%

expectvalue /Class
doit
dict_reversekeyiterator subclass: 'dict_reverseitemiterator'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
dict_reverseitemiterator category: 'Grail-Collections-Iterators'
%

expectvalue /Metaclass3
doit
dict_reversekeyiterator removeAllMethods: 0.
dict_reversekeyiterator removeAllMethods: 1.
dict_reversekeyiterator class removeAllMethods: 0.
dict_reversekeyiterator class removeAllMethods: 1.
dict_reversevalueiterator removeAllMethods: 0.
dict_reversevalueiterator removeAllMethods: 1.
dict_reversevalueiterator class removeAllMethods: 0.
dict_reversevalueiterator class removeAllMethods: 1.
dict_reverseitemiterator removeAllMethods: 0.
dict_reverseitemiterator removeAllMethods: 1.
dict_reverseitemiterator class removeAllMethods: 0.
dict_reverseitemiterator class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Instance Creation'
classmethod: dict_reversekeyiterator
___on: aPyDict
	^ self @env1:___new___ ___initOn: aPyDict
%

category: 'Grail-Initialization'
method: dict_reversekeyiterator
___initOn: aPyDict
	dict := aPyDict.
	used := aPyDict size.
	len := used.
	pos := aPyDict ___order___ size.
	^ self
%

category: 'Grail-Iteration'
method: dict_reversekeyiterator
___produce___: aKey
	"What one step yields for the entry aKey."

	^ aKey
%

category: 'Grail-Iteration'
method: dict_reversekeyiterator
___step___
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
%

category: 'Grail-Copying'
method: dict_reversekeyiterator
___copyState___
	^ self copy
%

set compile_env: 1

category: 'Grail-Iterator Protocol'
method: dict_reversekeyiterator
__class__
	^ self @env0:class
%

category: 'Grail-Iterator Protocol'
method: dict_reversekeyiterator
__iter__
	^ self
%

category: 'Grail-Iterator Protocol'
method: dict_reversekeyiterator
__next__
	| key |
	key := self @env0:___step___.
	key @env0:== nil ifTrue: [^ StopIteration @env0:signal].
	^ self @env0:___produce___: key
%

category: 'Grail-Iterator Protocol'
method: dict_reversekeyiterator
__length_hint__
	"dictiter_len: the items still expected, while the dict keeps its size."

	(dict @env0:~~ nil @env0:and: [used @env0:= dict @env0:size]) ifTrue: [^ len].
	^ 0
%

category: 'Grail-Pickling'
method: dict_reversekeyiterator
__reduce__
	"dictiter_reduce: iter() over a list of what a copy of this iterator would
	still yield, so this one is not advanced."

	| copy remaining key |
	copy := self @env0:___copyState___.
	remaining := list ___new___.
	[(key := copy @env0:___step___) @env0:== nil] @env0:whileFalse: [
		remaining append: (copy @env0:___produce___: key)].
	^ tuple @env0:withAll: {
		self ___builtinNamed___: #'iter'.
		tuple @env0:withAll: { remaining } }
%

set compile_env: 0

category: 'Grail-Iteration'
method: dict_reversevalueiterator
___produce___: aKey
	^ dict at: aKey
%

category: 'Grail-Iteration'
method: dict_reverseitemiterator
___produce___: aKey
	^ tuple with: aKey with: (dict at: aKey)
%
