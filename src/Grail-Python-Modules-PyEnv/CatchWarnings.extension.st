Extension { #name : 'CatchWarnings' }

{ #category : 'Grail-Context manager' }
CatchWarnings >> ___exit__: positional kw: kwargs [
	"Varargs __exit__.  CPython's signature is ``__exit__(self, *exc_info)'',
	so calling it with NO arguments is legal -- which is exactly how the
	reentry guard is tested, since the point is that it raises before looking
	at any exception."

	^ self
		__exit__: (positional @env0:size @env0:>= 1
			ifTrue: [positional @env0:at: 1] ifFalse: [nil])
		_: (positional @env0:size @env0:>= 2
			ifTrue: [positional @env0:at: 2] ifFalse: [nil])
		_: (positional @env0:size @env0:>= 3
			ifTrue: [positional @env0:at: 3] ifFalse: [nil])

]

{ #category : 'Grail-Context manager' }
CatchWarnings >> __enter__ [
	"Snapshot the warning state, and start recording when asked.

	CPython's contract is specific and callers depend on all of it: with
	record=True this answers a LIST that fills as warnings are emitted, so
	``len(w)'', ``w[0].message'' and ``del w[:]'' all work inside the block;
	otherwise it answers None.  Grail answered the context manager either way,
	which is why ``object of type 'CatchWarnings' has no len()'' was the most
	common single failure in test_warnings.

	Two things are saved, and the SECOND one used not to be.

	FILTERS are swapped for a copy rather than snapshotted and restored in
	place.  The difference shows: code inside the block must see a DIFFERENT
	list object from the one outside, because that is how the isolation is
	implemented and test_catch_warnings_defaults checks it directly.
	Restoring in place also cannot survive ``warnings.filters = <anything>''
	inside the block, which rebinds the name rather than mutating the list.

	SHOWWARNING is saved too, which it was not.  A block that replaces it --
	including the entirely ordinary ``wmod.showwarning = my_logger'' -- left
	the replacement installed for good, so every later warning in the process
	went to a logger nobody was reading any more.  In test_warnings that
	leaked out of test_catch_warnings_restore and quietly broke three later
	tests in other classes.

	With record=True showwarning is also RESET, because the recorder IS the
	display: a caller who had overridden it before entering still gets their
	warnings recorded (issue #28835), and only an override installed inside
	the block takes precedence."

	| log |
	"The reentry guard.  A catch_warnings is single-use: entering twice would
	overwrite the saved state with the state it had already installed, so the
	restore would put back the isolation instead of what was there before."
	_entered @env0:== true ifTrue: [
		RuntimeError ___signal___: 'Cannot enter ' @env0:, self @env0:printString
			@env0:, ' twice'].
	_entered := true.
	_coroutineMark := PythonCoroutine ___openCapture___.
	_savedFilters := _owner _filters.
	_owner ___setFilters___: _savedFilters @env0:copy.
	_savedSeen := KeyValueDictionary @env0:new.
	(_owner _seen) @env0:keysAndValuesDo: [:k :v |
		_savedSeen @env0:at: k put: v
	].
	_savedShowwarning := _owner ___moduleHook___: #'showwarning'.
	_hadShowwarning := _savedShowwarning @env0:isNil @env0:not.
	"3.11's shorthand: the filter goes in AFTER the copy is installed, so it
	lands inside the isolation and disappears with it on exit."
	_filterSpec @env0:isNil ifFalse: [
		_owner simplefilter: (_filterSpec @env0:at: 1)
			_: (_filterSpec @env0:at: 2)].
	_record == true ifFalse: [^ None].
	_owner ___clearModuleHook___: #'showwarning'.
	"The buffer IS an OrderedCollection, which is Grail's Python list."
	log := _owner _grail_start_recording.
	^ log

]

{ #category : 'Grail-Context manager' }
CatchWarnings >> __exit__: excType _: excValue _: tb [
	"Put back exactly what was there: the filter LIST OBJECT, the dedupe
	state, and whatever showwarning was -- including nothing, which restores
	the built-in.  Returning false lets any exception propagate (we don't
	suppress)."

	| current |
	_entered @env0:== true ifFalse: [
		RuntimeError ___signal___: 'Cannot exit ' @env0:, self @env0:printString
			@env0:, ' without entering first'].
	"``_entered'' is deliberately NOT cleared here, which is what CPython
	does: the flag means ``has been entered'', not ``is inside''.  So exiting
	twice re-restores the same saved state rather than raising -- and it
	happens, because Grail's with-statement calls __exit__ a SECOND time when
	the first call raises.  That is a codegen bug of its own, but a guard
	stricter than CPython's would turn it into an error in code that is doing
	nothing wrong."
	"A coroutine dropped undriven inside the block warns NOW, while this
	capture is still recording and its filters still apply -- CPython would
	have warned at the drop (PythonCoroutine class >> ___closeCapture___:).
	Cleared first, so the second __exit__ Grail's with-statement can send
	closes nothing twice."
	_coroutineMark @env0:notNil ifTrue: [ | mark |
		mark := _coroutineMark.
		_coroutineMark := nil.
		PythonCoroutine ___closeCapture___: mark].
	"Pop this context's buffer first, so an outer recorder resumes receiving."
	_record == true ifTrue: [_owner _grail_stop_recording].
	"Rebind the saved list rather than refilling the current one: the block
	may have replaced ``filters'' outright, and callers compare by identity."
	_owner ___setFilters___: _savedFilters.
	current := KeyValueDictionary @env0:new.
	_savedSeen @env0:keysAndValuesDo: [:k :v | current @env0:at: k put: v].
	_owner @env0:at: #_seen put: current.
	_hadShowwarning @env0:== true
		ifTrue: [_owner ___setModuleHook___: #'showwarning'
			to: _savedShowwarning]
		ifFalse: [_owner ___clearModuleHook___: #'showwarning'].
	^ false

]
