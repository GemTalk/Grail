! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- warnings module class
expectvalue /Class
doit
module subclass: 'warnings'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
warnings comment:
'Python warnings module - issue warnings and manage filter rules.

Minimal surface for itsdangerous / Werkzeug / Flask:
  warn(message[, category])          - emit a warning
  simplefilter(action[, category])   - install a single filter
  filterwarnings(action, ...)        - append a filter
  resetwarnings()                    - clear all filters
  catch_warnings(record=False)       - context manager
  formatwarning(...)                 - render to text

Filter actions: ignore / error / always / default / module / once.
Default behavior matches CPython on a fresh interpreter: warnings
print to Transcript once per (message, category) site.'
%

expectvalue /Class
doit
warnings category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
warnings removeAllMethods: 0.
warnings removeAllMethods: 1.
warnings class removeAllMethods: 0.
warnings class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: warnings
initialize
	"Default filter list mirrors CPython's `-W default` boot: one
	entry that lets each unique (message, category) through once.
	A separate `_seen` dict tracks what has already been emitted."

	self @env0:at: #filters put: OrderedCollection @env0:new.
	self @env0:at: #_seen put: KeyValueDictionary @env0:new
%

category: 'Grail-Internal API'
method: warnings
_get_filters
	"The active filter list -- CPython's non-public accessor, used by module
	functions and read directly by test_warnings.

	NOT delegated to _py_warnings: its version answers
	``_get_context()._filters'', a list held by ITS module-global context
	object.  Grail's filters live here, and handing back the other list would
	let a test mutate filters that Grail's own warn() never consults."

	^ self _filters
%

category: 'Grail-Internal API'
method: warnings
defaultaction
	"The action used when no filter matches.

	Stored rather than answered as a constant, because CPython lets it be
	reassigned -- and DELETED, which is the part that needs the store to be
	the one Python writes to.  ``del warnings.defaultaction'' can only remove
	an attribute that is actually bound in the dynamic-instVar holder, so the
	default is materialised there on first read instead of being conjured by
	an ifAbsent: that leaves nothing behind.  After a delete the next read
	materialises it again, which is what CPython does too: the C module keeps
	its own 'default' to fall back on."

	| v |
	v := self ___moduleHook___: #defaultaction.
	v @env0:isNil ifFalse: [^ v].
	self @env0:dynamicInstVarAt: #defaultaction put: 'default'.
	^ 'default'
%

category: 'Grail-Internal API'
method: warnings
onceregistry
	"The registry backing the ``once'' action -- keyed by (text, category)
	with no file or line, which is what makes ``once'' mean once per process.

	Read through ___moduleHook___ so that ``warnings.onceregistry = {}'' is
	honoured: a Python assignment lands in the dynamic-instVar holder, and
	reading only the SymbolDictionary made the reset invisible.  DELETING it
	falls back to the SymbolDictionary copy, which still holds what was
	recorded -- the same shape as CPython, where removing the attribute
	leaves the C module's own registry in place."

	| v d |
	v := self ___moduleHook___: #onceregistry.
	v @env0:isNil ifFalse: [^ v].
	d := KeyValueDictionary @env0:new.
	self @env0:at: #onceregistry put: d.
	^ d
%

category: 'Grail-Internal API'
method: warnings
_filters_version
	"Bumped whenever the filter list changes.  CPython caches filter lookups
	against it; Grail does not cache, but _py_warnings' helpers increment it
	through _wm and test_warnings reads it."

	^ self @env0:at: #_filters_version ifAbsent: [1]
%

category: 'Grail-Internal API'
method: warnings
_filters_version: anInteger
	self @env0:at: #_filters_version put: anInteger.
	^ None
%

category: 'Grail-Internal API'
method: warnings
_filters_mutated
	"Announce that the filter list changed."

	^ self _filters_mutated_lock_held
%

category: 'Grail-Internal API'
method: warnings
_filters_mutated_lock_held
	"The same, for a caller already holding the lock.  Grail is
	single-threaded per session, so the two are one method."

	self @env0:at: #_filters_version put: self _filters_version @env0:+ 1.
	^ None
%

category: 'Grail-Internal API'
method: warnings
_acquire_lock
	"No-op: see _lock."

	^ None
%

category: 'Grail-Internal API'
method: warnings
_release_lock
	"No-op counterpart to _acquire_lock."

	^ None
%

category: 'Grail-Internal API'
method: warnings
WarningMessage
	"The record type catch_warnings(record=True) appends.  GRAIL's class, not
	_py_warnings', so a warning recorded through either path is the same kind
	of object -- _py_warnings' _showwarnmsg_impl builds these through
	``_wm.WarningMessage''."

	^ WarningMessage
%

category: 'Grail-Internal API'
method: warnings
_lock
	"The lock _py_warnings takes around filter mutation.  A Grail session is
	single-threaded, so it is uncontended by construction -- but it has to be
	a real context manager, because _py_warnings writes ``with _lock:''."

	^ self ___pyWarningsModule___ @env1:_lock
%

category: 'Grail-Internal API'
method: warnings
_OptionError
	"Raised for a malformed -W option; _setoption signals it."

	^ self ___pyWarningsModule___ @env1:_OptionError
%

category: 'Grail-Internal API'
method: warnings
___pyWarningsFn___: aName
	"The named function out of the vendored _py_warnings, with _wm pointed at
	this module first.  Delegating rather than reimplementing keeps CPython's
	exact semantics for the helpers that are pure logic over _wm's state --
	and because _wm IS this module, they read and write GRAIL's filters."

	^ self ___pyWarningsModule___ @env1:___pyAttrLoad___: aName
%

category: 'Grail-Internal API'
method: warnings
__get_filters: positional kw: kwargs
	"Varargs entry for _get_filters().  Needed because test_warnings reaches
	it as ``self.module._get_filters()'' -- through a VARIABLE, so codegen
	emits attribute-load-then-call rather than a direct send, and the unary
	method would auto-invoke on the load and leave the LIST being called."

	^ self _get_filters
%

category: 'Grail-Internal API'
method: warnings
__filters_mutated: positional kw: kwargs
	"Varargs entry for _filters_mutated(); see __get_filters:kw:."

	^ self _filters_mutated
%

category: 'Grail-Internal API'
method: warnings
__filters_mutated_lock_held: positional kw: kwargs
	"Varargs entry for _filters_mutated_lock_held()."

	^ self _filters_mutated_lock_held
%

category: 'Grail-Internal API'
method: warnings
__acquire_lock: positional kw: kwargs
	"Varargs entry for _acquire_lock()."

	^ None
%

category: 'Grail-Internal API'
method: warnings
__release_lock: positional kw: kwargs
	"Varargs entry for _release_lock()."

	^ None
%

category: 'Grail-Internal API'
method: warnings
__add_filter: positional kw: kwargs
	"_add_filter(*item, append) -- inserts or appends a filter tuple and
	announces the mutation.  Delegated: the list it edits is Grail's, because
	it reaches it through _wm._get_filters()."

	^ (self ___pyWarningsFn___: #'_add_filter')
		@env1:value: positional value: kwargs
%

category: 'Grail-Internal API'
method: warnings
__getcategory: positional kw: kwargs
	"_getcategory(category) -- resolve a -W option's category name to a class."

	^ (self ___pyWarningsFn___: #'_getcategory')
		@env1:value: positional value: kwargs
%

category: 'Grail-Internal API'
method: warnings
__getaction: positional kw: kwargs
	"_getaction(action) -- resolve a -W option's action, abbreviations
	included."

	^ (self ___pyWarningsFn___: #'_getaction')
		@env1:value: positional value: kwargs
%

category: 'Grail-Internal API'
method: warnings
__setoption: positional kw: kwargs
	"_setoption(arg) -- parse one -W option and install the filter it names.
	Calls back through _wm.filterwarnings, so the filter lands in Grail's
	list."

	^ (self ___pyWarningsFn___: #'_setoption')
		@env1:value: positional value: kwargs
%

category: 'Grail-Internal API'
method: warnings
__showwarnmsg: positional kw: kwargs
	"_showwarnmsg(msg) -- display a WarningMessage through whatever
	showwarning is currently bound."

	^ (self ___pyWarningsFn___: #'_showwarnmsg')
		@env1:value: positional value: kwargs
%

category: 'Grail-Internal API'
method: warnings
__showwarnmsg_impl: positional kw: kwargs
	"_showwarnmsg_impl(msg) -- the default display, bypassing an override."

	^ (self ___pyWarningsFn___: #'_showwarnmsg_impl')
		@env1:value: positional value: kwargs
%

category: 'Grail-Internal API'
method: warnings
__formatwarnmsg: positional kw: kwargs
	"_formatwarnmsg(msg) -- render a WarningMessage through whatever
	formatwarning is currently bound."

	^ (self ___pyWarningsFn___: #'_formatwarnmsg')
		@env1:value: positional value: kwargs
%

category: 'Grail-Internal API'
method: warnings
__formatwarnmsg_impl: positional kw: kwargs
	"_formatwarnmsg_impl(msg) -- the default rendering."

	^ (self ___pyWarningsFn___: #'_formatwarnmsg_impl')
		@env1:value: positional value: kwargs
%

category: 'Grail-Private'
method: warnings
_filters
	"The live filter list.

	Read through ___moduleHook___ rather than straight out of the
	SymbolDictionary: ``warnings.filters = [...]'' is a documented thing to
	do and lands in the dynamic-instVar store, which an attribute read
	prefers.  Reading only the SymbolDictionary meant an assigned list was
	visible to Python and invisible to the filtering."

	| existing oc |
	existing := self ___moduleHook___: #filters.
	existing @env0:isNil ifFalse: [^ existing].
	oc := OrderedCollection @env0:new.
	self @env0:at: #filters put: oc.
	^ oc
%

category: 'Grail-Private'
method: warnings
_seen
	^ self @env0:at: #_seen ifAbsent: [
		| d |
		d := KeyValueDictionary @env0:new.
		self @env0:at: #_seen put: d.
		d
	]
%

category: 'Grail-Private'
method: warnings
_recordList
	"The INNERMOST active recording buffer, or nil when nothing is recording.

	A stack, not a slot: assertWarns nests inside catch_warnings(record=True)
	-- test_warnings does exactly that -- and with one slot the inner context
	overwrote the outer and then cleared it on exit, so the outer silently
	stopped recording partway through its block.  Warnings go to the innermost
	recorder only, which is what CPython's showwarning chaining amounts to."

	| stack |
	stack := self @env0:at: #_recordStack ifAbsent: [nil].
	(stack == nil or: [stack @env0:isEmpty]) ifTrue: [^ nil].
	^ stack @env0:last
%

category: 'Grail-Recording'
method: warnings
_grail_snapshot_seen
	"A copy of the dedupe table, for a caller that is about to replace the
	filter list and must put both back.

	The two travel together: resetwarnings() clears _seen as well, so
	restoring filters without restoring _seen would leave an assertWarns
	block having silently wiped the enclosing code's dedupe state."

	| copy |
	copy := KeyValueDictionary @env0:new.
	(self _seen) @env0:keysAndValuesDo: [:k :v | copy @env0:at: k put: v].
	^ copy
%

category: 'Grail-Recording'
method: warnings
_grail_restore_filters: savedFilters _: savedSeen
	"Put back what _grail_snapshot_seen and a filters copy took.

	The filter list is restored IN PLACE rather than replaced: catch_warnings
	holds the same OrderedCollection and would otherwise keep writing to the
	object nobody reads any more."

	| current |
	current := self _filters.
	current @env0:removeAll: current @env0:copy.
	savedFilters @env0:do: [:f | current @env0:addLast: f].
	savedSeen @env0:isNil ifFalse: [
		| seen |
		seen := KeyValueDictionary @env0:new.
		savedSeen @env0:keysAndValuesDo: [:k :v | seen @env0:at: k put: v].
		self @env0:at: #_seen put: seen].
	^ None
%

category: 'Grail-Recording'
method: warnings
_grail_start_recording
	"Begin capturing warnings for unittest.assertWarns: while active, warn()
	APPENDS each (message, category) to this buffer and returns without
	raising, printing, or deduping -- so code after the warn() call in the
	assertWarns with-block still runs (CPython records warnings; it does not
	raise them).  Returns None (the caller discards it)."

	| stack |
	stack := self @env0:at: #_recordStack ifAbsent: [nil].
	stack == nil ifTrue: [
		stack := OrderedCollection @env0:new.
		self @env0:at: #_recordStack put: stack].
	"An OrderedCollection IS Grail's Python list, so the buffer handed to
	catch_warnings(record=True) supports len(), w[0] and del w[:] as it stands."
	stack @env0:addLast: OrderedCollection @env0:new.
	^ stack @env0:last
%

category: 'Grail-Recording'
method: warnings
_grail_stop_recording
	"Stop capturing and return the recorded warnings as a list of
	[message, category] pairs (empty if none fired).  Resets the buffer to
	nil so subsequent warnings resume normal filter processing."

	| stack |
	stack := self @env0:at: #_recordStack ifAbsent: [nil].
	(stack == nil or: [stack @env0:isEmpty])
		ifTrue: [^ OrderedCollection @env0:new].
	^ stack @env0:removeLast
%

category: 'Grail-Private'
method: warnings
_resolveCategory: category
	"Default to UserWarning when caller passes nil/None."

	(category == nil @env0:or: [category == None]) ifTrue: [^ UserWarning].
	^ category
%

category: 'Grail-Private'
method: warnings
___warningLocation___: aStacklevel
	^ self ___warningLocation___: aStacklevel skipPrefixes: nil
%

category: 'Grail-Private'
method: warnings
___warningLocation___: aStacklevel skipPrefixes: skipPrefixes
	"The SOURCE LOCATION a warning is being raised from, as
	{ filename. lineno }, or nil when no live Python frame can be built.

	CPython records this on every warning; Grail could not, and
	_AssertWarnsContext said so in its own comment -- filename ``<unknown>''
	and lineno 0.  That is stale: sys._getframe now answers a PyFrame carrying
	f_code.co_filename and f_lineno, which is the same live stack
	___warningOrigin___ already walks to match a filter's ``module=''.

	The frame is obtained by RAISING (BaseException ___liveFrameChain___), so
	this costs an exception per call.  It is therefore computed only where a
	warning is being RECORDED -- assertWarns and catch_warnings(record=True),
	both test-time paths -- and never on the ordinary warn-and-print route."

	| frame code fname lineno hops |
	frame := [BaseException @env0:___liveFrameChain___]
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	frame == nil ifTrue: [^ nil].
	"stacklevel 1 is the innermost frame -- the warn() call site.  Each level
	above walks one f_back.  RUNNING OFF THE TOP answers nil now, where it
	used to keep the outermost frame: CPython's warn treats an exhausted walk
	as ``no frame to blame'' and reports <sys> (its _getframe raises
	ValueError there), so keeping the outermost frame blamed an arbitrary
	caller -- test_stacklevel's stacklevel=9999 pins the difference.

	With skipPrefixes (PEP-marked 3.12 behaviour, warn's keyword-only
	``skip_file_prefixes''), each hop lands on the next frame whose filename
	does NOT start with one of the prefixes -- a library skips ITSELF so the
	warning blames its caller's caller, however deep the library's own
	plumbing runs.  The prefix test also applies to the level-1 frame the
	walk starts from, because the caller passed prefixes precisely to skip
	frames like it."
	hops := ((aStacklevel @env0:isNil) ifTrue: [1] ifFalse: [aStacklevel]) @env0:- 1.
	"NO separate skip of the starting frame: CPython takes _getframe(1) as it
	comes -- prefixed or not -- and lets the FIRST hop advance past it, since
	_next_external_frame both moves and skips.  A pre-skip here double-counted
	and landed one frame too far out (unittest instead of the test file)."
	[hops @env0:> 0] @env0:whileTrue: [
		| back |
		back := skipPrefixes @env0:isNil
			ifTrue: [[frame @env0:dynamicInstVarAt: #'f_back']
				@env0:on: Error do: [:ex | ex @env0:return: nil]]
			ifFalse: [self ___nextExternalFrame___: frame
				skipPrefixes: skipPrefixes].
		(back @env0:isNil or: [back @env0:== None])
			ifTrue: [^ nil]
			ifFalse: [frame := back. hops := hops @env0:- 1]].
	code := [frame @env0:dynamicInstVarAt: #'f_code']
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	code == nil ifTrue: [^ nil].
	fname := [code @env0:dynamicInstVarAt: #'co_filename']
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	(fname == nil or: [fname @env0:== None]) ifTrue: [^ nil].
	lineno := [frame @env0:dynamicInstVarAt: #'f_lineno']
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	(lineno == nil or: [lineno @env0:== None]) ifTrue: [lineno := 0].
	^ Array @env0:with: fname @env0:asString with: lineno
%

category: 'Grail-Private'
method: warnings
___frameFile___: aFrame startsWithAnyOf: prefixes
	"Does this frame's co_filename begin with any of the prefixes?  The
	comparison CPython's _next_external_frame makes, via str.startswith on a
	tuple."

	| fname |
	fname := [(aFrame @env0:dynamicInstVarAt: #'f_code')
			@env0:dynamicInstVarAt: #'co_filename']
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	fname @env0:isNil ifTrue: [^ false].
	fname := fname @env0:asString.
	prefixes @env0:do: [:p |
		(fname @env0:size @env0:>= p @env0:size
			and: [(fname @env0:copyFrom: 1 to: p @env0:size) @env0:= p @env0:asString])
			ifTrue: [^ true]].
	^ false
%

category: 'Grail-Private'
method: warnings
___nextExternalFrame___: aFrame skipPrefixes: prefixes
	"The next frame outward that is NOT prefix-matched, or nil off the top --
	CPython's _next_external_frame, minus its internal-importlib test, which
	Grail does not need: its import machinery is Smalltalk and never appears
	in the chain at all."

	| f |
	f := aFrame.
	[f := [f @env0:dynamicInstVarAt: #'f_back']
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	(f @env0:isNil or: [f @env0:== None]) ifTrue: [^ nil].
	self ___frameFile___: f startsWithAnyOf: prefixes] @env0:whileTrue.
	^ f
%

category: 'Grail-Private'
method: warnings
___warningOrigin___
	"The MODULE NAME a warning is being raised from -- what CPython matches
	a filter's ``module='' against.

	It is the dotted ``__name__'', NOT the filename.  CPython's C
	implementation takes it from the raising frame's globals['__name__'],
	so ``filterwarnings('error', module='__main__')'' fires for a script
	while the script's own PATH does not match at all.  (The pure-Python
	warn_explicit fallback derives a name from the filename instead, which
	is why the two look interchangeable until you test them -- they are
	not, and matching the filename silently scoped every filter to
	something no caller writes.)

	Grail gets the live stack the only way a running gem can, by RAISING:
	BaseException class>>___liveFrameChain___, which sys._getframe already
	stands on.  Frames carry no globals, so the name is recovered by
	matching the frame's co_filename against the __file__ of each imported
	module.  Answers nil when no frame or no module matches, and a nil
	origin means a module-scoped filter still cannot be evaluated."

	| frame code fname mods hit |
	frame := [BaseException @env0:___liveFrameChain___]
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	frame == nil ifTrue: [^ nil].
	code := [frame @env0:dynamicInstVarAt: #'f_code']
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	code == nil ifTrue: [^ nil].
	fname := [code @env0:dynamicInstVarAt: #'co_filename']
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	(fname == nil or: [fname @env0:== None]) ifTrue: [^ nil].
	fname := fname @env0:asString.
	mods := [importlib @env1:modules] @env0:on: Error do: [:ex | ex @env0:return: nil].
	mods == nil ifTrue: [^ nil].
	hit := nil.
	[mods @env0:keysAndValuesDo: [:k :m |
		hit == nil ifTrue: [
			| f |
			f := [m @env0:dynamicInstVarAt: #'__file__']
				@env0:on: Error do: [:ex | ex @env0:return: nil].
			(f notNil and: [f @env0:asString @env0:= fname]) ifTrue: [hit := k @env0:asString]]]]
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	^ hit
%

category: 'Grail-Private'
method: warnings
_actionFor: message _: category
	"The action for a warning whose origin has to be inferred."

	^ self ___actionFor___: message _: category _: nil _: 0
%

category: 'Grail-Private'
method: warnings
___messageText___: message
	"str(message).  The message is normally a Warning INSTANCE, and
	Smalltalk's asString answers an exception's GemStone description rather
	than its text -- so matching a filter pattern against asString compared
	the pattern with ``a UserWarning occurred (error 2702)''."

	^ [message @env1:__str__]
		@env0:on: AbstractException do: [:ex |
			ex @env0:return: message @env0:asString]
%

category: 'Grail-Private'
method: warnings
___patternMatches___: aPattern _: aString
	"Does a filter's compiled pattern apply to this string?

	CPython calls #match, which is ANCHORED AT THE START and answers a match
	object or None -- so ``match'' applies to ``match prefix'' but not to
	``suffix match''.  Grail used a SUBSTRING test, which is a different
	predicate in both directions: it accepted the suffix case, and it
	rejected ``hex*'' against ``hex/oct'' because it compared the pattern
	LITERALLY rather than as a regex.

	Anything with a #match is accepted, not just a compiled pattern:
	test_mutate_filter_list installs filters holding a hand-written object
	and CPython calls it the same way.  A pattern that raises is treated as
	not matching rather than allowed to escape into the warn() call."

	| r |
	aString @env0:isNil ifTrue: [^ false].
	r := [aPattern @env1:match: aString @env0:asString]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	^ r @env0:notNil and: [r @env0:~~ None and: [r @env0:~~ false]]
%

category: 'Grail-Private'
method: warnings
___actionFor___: message _: category _: explicitModule _: lineno
	"Walk the filter list, answering the first matching action.

	Each filter is CPython's five-tuple (action, message, category, module,
	lineno), and a nil in any of the middle three means ``no constraint''.
	All four conditions must hold, which is what makes a filter list
	expressive: category by SUBCLASS, message and module by anchored regex,
	lineno exactly -- and lineno 0 meaning ``any''."

	| msgStr origin needsOrigin |
	msgStr := self ___messageText___: message.
	"Only pay for the stack capture when a filter actually names a module and
	the caller has not said which module this is: ___warningOrigin___ costs a
	RAISE, and the overwhelmingly common filter list names no module at all."
	needsOrigin := (self _filters) @env0:detect: [:f |
		f @env0:size @env0:>= 4 and: [(f @env0:at: 4) @env0:notNil]] ifNone: [nil].
	origin := explicitModule @env0:notNil
		ifTrue: [explicitModule]
		ifFalse: [needsOrigin @env0:isNil
			ifTrue: [nil] ifFalse: [self ___warningOrigin___]].
	"Iterate over a COPY: a filter's pattern is arbitrary code -- CPython's
	own test installs one that empties the list when consulted."
	(self _filters) @env0:copy @env0:do: [:f |
		| catMatch msgMatch modMatch lineMatch fCat fMsg fMod fLine |
		fMsg := f @env0:at: 2.
		fCat := f @env0:at: 3.
		"A filter may have been built by hand or by _py_warnings' own
		_add_filter, so read the tail defensively."
		fMod := f @env0:size @env0:>= 4 ifTrue: [f @env0:at: 4] ifFalse: [nil].
		fLine := f @env0:size @env0:>= 5 ifTrue: [f @env0:at: 5] ifFalse: [0].
		"``category'' is not always a class: warn() accepts anything, and
		test_warning_classes passes a string deliberately.  Only a real class
		can be asked about its superclasses."
		catMatch := (fCat @env0:isNil or: [fCat @env0:== None])
			@env0:or: [category @env0:== fCat
				@env0:or: [(category @env0:isKindOf: Behavior)
					@env0:and: [category @env0:inheritsFrom: fCat]]].
		msgMatch := (fMsg @env0:isNil or: [fMsg @env0:== None])
			@env0:or: [self ___patternMatches___: fMsg _: msgStr].
		"An origin of nil means no module could be established, so a
		module-scoped filter cannot be shown to apply and is skipped -- the
		safe direction: a warning is not escalated to an error it was never
		proven to name."
		modMatch := (fMod @env0:isNil or: [fMod @env0:== None])
			@env0:or: [self ___patternMatches___: fMod _: origin].
		lineMatch := (fLine @env0:isNil or: [fLine @env0:== None
			or: [fLine @env0:= 0]])
				@env0:or: [lineno @env0:notNil and: [lineno @env0:= fLine]].
		(catMatch @env0:and: [msgMatch @env0:and: [modMatch @env0:and: [lineMatch]]])
			ifTrue: [^ f @env0:at: 1]].
	"No filter matched: the module's ``defaultaction'', which CPython lets a
	caller reassign."
	^ self defaultaction
%

category: 'Grail-Public'
method: warnings
warn: message
	"warn(message) - emit a UserWarning."

	^ self warn: message _: nil
%

category: 'Grail-Public'
method: warnings
warn: message _: category _: stacklevel
	"warn(message, category, stacklevel) - stacklevel selects which frame is
	reported as the origin.  Honoured now; see ___warn___:category:stacklevel:."

	^ self ___warn___: message category: category
		stacklevel: ((stacklevel @env0:isNil or: [stacklevel @env0:== None])
			ifTrue: [1] ifFalse: [stacklevel])
%

category: 'Grail-Public'
method: warnings
_warn: positional kw: keywords
	"Varargs dispatcher for warn() - first-class calls and keyword
	args (warnings.warn(msg, DeprecationWarning, stacklevel=2))."

	| nargs msg cat lvl prefixes |
	nargs := positional @env0:size.
	nargs @env0:< 1 ifTrue: [
		TypeError ___signal___: 'warn() missing required argument: message'].
	msg := positional @env0:at: 1.
	cat := nargs @env0:>= 2 ifTrue: [positional @env0:at: 2] ifFalse: [nil].
	(cat == nil and: [keywords ~~ nil]) ifTrue: [
		(keywords @env0:includesKey: 'category') ifTrue: [
			cat := keywords @env0:at: 'category']].
	"stacklevel by position or by keyword.  It reaches here for the keyword
	spelling -- ``warn(msg, cat, stacklevel=2)'' -- which the fixed-arity forms
	cannot take, and dropping it silently blamed the library rather than its
	caller."
	"skip_file_prefixes is a TUPLE OF STR -- a list, a bytes element or a bare
	string are each a TypeError in CPython.  Validated here and now also ACTED
	ON: the tuple selects which frames the stacklevel walk skips when
	attributing the warning."
	prefixes := nil.
	(keywords ~~ nil and: [keywords @env0:includesKey: 'skip_file_prefixes'])
		ifTrue: [
			| pref |
			pref := keywords @env0:at: 'skip_file_prefixes'.
			(pref @env0:isKindOf: tuple) ifFalse: [
				TypeError ___signal___:
					'skip_file_prefixes must be a tuple of strs'].
			pref @env0:do: [:each |
				(each @env0:isKindOf: CharacterCollection) ifFalse: [
					TypeError ___signal___:
						'skip_file_prefixes must be a tuple of strs']].
			pref @env0:isEmpty ifFalse: [prefixes := pref]].
	lvl := nargs @env0:>= 3 ifTrue: [positional @env0:at: 3] ifFalse: [nil].
	(lvl == nil and: [keywords ~~ nil]) ifTrue: [
		(keywords @env0:includesKey: 'stacklevel') ifTrue: [
			lvl := keywords @env0:at: 'stacklevel']].
	lvl := (lvl @env0:isNil or: [lvl @env0:== None]) ifTrue: [1] ifFalse: [lvl].
	"Non-empty prefixes force at least CPython's stacklevel-2 behaviour: the
	caller passed them precisely because level 1 (its own frame) is the thing
	being skipped."
	prefixes @env0:notNil ifTrue: [lvl := lvl @env0:max: 2].
	^ self ___warn___: msg category: cat stacklevel: lvl
		skipPrefixes: prefixes
%

category: 'Grail-Public'
method: warnings
__deprecated: positional kw: keywords
	"_deprecated(name, message=..., *, remove) - the stdlib's own helper for
	announcing that a name goes away in a named release.  Vendored wave.py
	calls it from five deprecated methods, so test_wave errored on all of
	them without it.

	CPython also RAISES RuntimeError when the removal version has already
	passed, which is a guard for CPython's own release process rather than
	something a caller can trigger; Grail keeps it, comparing against
	sys.version_info the same way.

	``remove'' is keyword-only in CPython and always passed that way."

	| name message remove removeFormatted msg vi |
	positional @env0:size @env0:< 1 ifTrue: [
		TypeError ___signal___:
			'_deprecated() missing 1 required positional argument: ''name'''].
	name := positional @env0:at: 1.
	message := positional @env0:size @env0:>= 2
		ifTrue: [positional @env0:at: 2]
		ifFalse: [
			(keywords ~~ nil and: [keywords @env0:includesKey: 'message'])
				ifTrue: [keywords @env0:at: 'message']
				ifFalse: ['{name!r} is deprecated and slated for removal in Python {remove}']].
	remove := (keywords ~~ nil and: [keywords @env0:includesKey: 'remove'])
		ifTrue: [keywords @env0:at: 'remove']
		ifFalse: [
			TypeError ___signal___:
				'_deprecated() missing 1 required keyword-only argument: ''remove'''].
	removeFormatted := (remove @env1:__getitem__: 0) @env0:printString
		@env0:, '.' @env0:, (remove @env1:__getitem__: 1) @env0:printString.

	"Past the announced removal is a bug in the CALLER's version bookkeeping.

	The version compared against is ``_version'' when the caller supplies it
	-- test.test_warnings drives every branch of this rule with synthetic
	versions, and ignoring the keyword judged them all against the REAL
	interpreter -- else sys.version_info (``sys'' names the module CLASS in
	Smalltalk; the attributes live on its singleton, which ___instance___
	answers).  CPython's rule, exactly:

	    _version[:2] > remove, or
	    _version[:2] == remove and _version[3] != 'alpha'

	-- the alpha clause because a deprecation may still be delivered during
	the removal version's own alphas; from beta on, forgetting to delete the
	thing is the RuntimeError this guard exists to raise."
	vi := (keywords ~~ nil and: [keywords @env0:includesKey: '_version'])
		ifTrue: [keywords @env0:at: '_version']
		ifFalse: [(Python @env0:at: #sys) @env0:___instance___ @env1:version_info].
	(((vi @env1:__getitem__: 0) @env0:> (remove @env1:__getitem__: 0))
		or: [((vi @env1:__getitem__: 0) @env0:= (remove @env1:__getitem__: 0))
			and: [((vi @env1:__getitem__: 1) @env0:> (remove @env1:__getitem__: 1))
				or: [((vi @env1:__getitem__: 1) @env0:= (remove @env1:__getitem__: 1))
					and: [([(vi @env1:__getitem__: 3) @env0:asString]
						@env0:on: Error do: [:ex | ex @env0:return: 'final'])
							@env0:~= 'alpha']]]])
		ifTrue: [
			^ RuntimeError ___signal___: ('''' @env0:, name @env0:printString
				@env0:, ''' was slated for removal after Python '
				@env0:, removeFormatted @env0:, ' alpha')].

	"CPython formats with str.format; the two fields are all wave uses."
	msg := message.
	msg := msg @env1:replace: '{name!r}' _: name @env0:printString.
	msg := msg @env1:replace: '{name}' _: name.
	msg := msg @env1:replace: '{remove}' _: removeFormatted.
	^ self warn: msg _: DeprecationWarning
%

category: 'Grail-Private'
method: warnings
___pyWarningsModule___
	"The vendored CPython ``_py_warnings'', imported on demand.

	CPython 3.14 split warnings into a 99-line ``warnings'' shim over an
	866-line pure-Python ``_py_warnings''.  Grail keeps its own Smalltalk
	warnings -- it is wired into assertWarns recording and the filter state
	the rest of Grail uses -- but there is no reason to REIMPLEMENT the parts
	of _py_warnings that are ordinary Python.  PEP 702's @deprecated is one:
	it patches __new__ and __init_subclass__ through functools.wraps, and
	CPython''s version of that runs here unchanged.

	_py_warnings deliberately holds no state of its own: every global it
	touches is read off ``_wm'', the module set by _set_module.  It starts as
	None, so pointing it at THIS module is what makes a warning raised by
	@deprecated land in Grail''s filters and be visible to Grail''s
	catch_warnings -- rather than in a second, parallel set that nothing
	else consults."

	| m path |
	m := importlib @env1:lookupModule: '_py_warnings'.
	m == nil ifTrue: [
		path := importlib @env1:___moduleNameToPath___: '_py_warnings'.
		path == nil ifTrue: [^ nil].
		m := importlib @env0:loadModuleFromPath: path name: '_py_warnings'].
	"NOTE: this does NOT touch _wm.  Only ___pyWarningsModuleAsWm___ does,
	and only @deprecated needs it -- see there for why the distinction is
	load-bearing."
	^ m
%

category: 'Grail-Private'
method: warnings
___pyWarningsModuleAsWm___
	"The vendored module with _wm pointed at THIS one.

	_py_warnings holds no state of its own: every global it touches is read
	off _wm, which starts as None.  @deprecated emits its warning at CALL
	time, through _wm.warn, so _wm has to name Grail's warnings or the warning
	lands in another module's filter state and Grail's catch_warnings never
	sees it.

	Kept SEPARATE from ___pyWarningsModule___, which the internal-API
	delegates use, because the two want opposite things.  test_warnings drives
	both implementations by repointing _wm per variant
	(``py_warnings._set_module(py_warnings)''), and a delegate that reclaimed
	_wm on every call took it back from under the py variant -- measured at 28
	of 187 passing against 76 when the delegates leave it alone.  Only
	@deprecated claims it, and only when it is reached."

	| m |
	m := self ___pyWarningsModule___.
	m == nil ifTrue: [^ nil].
	m @env1:_set_module: self.
	^ m
%

category: 'Grail-Public'
method: warnings
deprecated
	"PEP 702 ``@deprecated'' -- mark a class, function or overload as
	deprecated, warning at runtime on use.

	This is CPython''s own implementation, reached through _py_warnings
	rather than rewritten in Smalltalk: it wraps __new__ and
	__init_subclass__ for a class and the call for a function, all through
	functools.wraps, and none of that is easier to express here than it is
	in Python."

	| m |
	m := self ___pyWarningsModuleAsWm___.
	m == nil ifTrue: [
		ImportError ___signal___:
			'cannot import name ''deprecated'' from ''warnings'': the vendored _py_warnings is not on the search path'].
	^ m @env1:deprecated
%

category: 'Grail-Public'
method: warnings
_set_module: aModule
	"_py_warnings''s hook for choosing which module''s globals its helpers
	read.  Grail''s warnings holds its own state and does not consult this,
	but the name has to exist and has to be harmless: test_warnings calls it
	on BOTH implementations under test before running anything."

	self @env0:at: #'_wm' put: aModule.
	^ None
%

category: 'Grail-Public'
method: warnings
warn: message _: category
	"warn(message, category) - emit a warning of `category` (defaults
	to UserWarning when nil/None).  stacklevel 1 means the warn() call site
	itself, which is CPython's default."

	^ self ___warn___: message category: category stacklevel: 1
%

category: 'Grail-Public'
method: warnings
___warn___: message category: category stacklevel: stacklevel
	^ self ___warn___: message category: category stacklevel: stacklevel
		skipPrefixes: nil
%

category: 'Grail-Private'
method: warnings
___warn___: message category: category stacklevel: stacklevel skipPrefixes: skipPrefixes
	"The core of warn().  ``stacklevel'' selects WHICH frame is reported as
	the warning's origin: 1 is the warn() call site, 2 its caller, and so on.
	It used to be accepted and dropped, on the grounds that Grail tracked no
	source location at all -- now that it does, the argument is the whole
	point.  gettext computes one deliberately, so a plural-form deprecation is
	blamed on the code that asked for the plural rather than on gettext.py."

	| cat action key loc text lineno registry |
	cat := self ___categoryFor___: message _: category.
	"THE FILTER DECIDES FIRST.  Recording used to happen before any of this,
	so catch_warnings(record=True) captured every warning regardless of the
	filters -- simplefilter('ignore') recorded one where CPython records
	none, and 'once' recorded every repeat.  In CPython the recorder sits
	BEHIND the filter: it replaces showwarning, which is only reached by a
	warning the filters decided to show.  So the order here is the semantics,
	not a detail of the implementation."
	action := self _actionFor: message _: cat.
	action @env0:= 'ignore' ifTrue: [^ None].
	action @env0:= 'error' ifTrue: [^ cat ___signal___: message].
	"Default / once / module: dedupe by (text, category) and emit."
	"The dedupe is the REGISTRY's job now, and it needs the line number, so
	the call site is resolved first -- but still only for a warning the
	filters did not already dispose of above.  Grail's registry is one
	module-global table where CPython keeps one per calling module; the
	difference shows up as warnings from different modules sharing a dedupe,
	which is narrower than the old key, not wider: that one had no line
	number in it at all, so ``default'' meant once per PROCESS rather than
	once per call site."
	loc := self ___warningLocation___: stacklevel skipPrefixes: skipPrefixes.
	text := self ___messageText___: message.
	"nil, NOT 0, when the call site could not be resolved.  The registry key
	carries the line, so substituting a placeholder would file two DIFFERENT
	call sites under the same key and drop the second warning -- turning
	``at most once per site'' into ``at most once'', silently, and only when
	the frame walk happens to fail.  An unknown location is not a location
	two sites share, and ___recordAction___ declines to dedupe on one."
	lineno := loc @env0:isNil ifTrue: [nil] ifFalse: [loc @env0:at: 2].
	"ZERO also means unknown here.  ___warningLocation___ answers 0 when it
	found a frame but the frame carried no f_lineno -- so the location is
	non-nil and useless, and every site in the process collides on line 0.
	CPython never reports 0 for a real call site, so there is nothing to lose
	by reading it the same way as a missing frame."
	(lineno @env0:notNil and: [lineno @env0:= 0]) ifTrue: [lineno := nil].
	registry := self _seen.
	self ___prepareRegistry___: registry.
	lineno @env0:isNil ifFalse: [
		key := self ___registryKey___: text _: cat _: lineno.
		"The quick test: a warning already in the registry never reaches the
		action bookkeeping at all."
		(registry @env0:at: key ifAbsent: [nil]) @env0:isNil ifFalse: [^ None]].
	(self ___recordAction___: action text: text category: cat
		lineno: lineno registry: registry) ifFalse: [^ None].
	"Past everything, so this warning IS going to be shown.  When a recorder
	is active it IS the display -- capture instead of printing, so code after
	the warn() in the with-block still runs (test_re's
	test_possible_set_operations binds a name there)."
	"NO frame to blame -- the walk ran off the top, or there was no Python
	frame at all.  CPython lands in one place for both: its _getframe raises
	ValueError, warn catches it, and the warning reports against ``<sys>''
	line 0 -- measured, not assumed: the docs say nothing and the first cut
	guessed 1 -- which is what test_stacklevel pins for stacklevel=9999.
	``<unknown>''/0 was Grail's private spelling of the same idea, visible to
	anything that read the filename.  The registry lineno above stays nil for
	this case on purpose: <sys> warnings are all one line-1 site, and
	deduping them together would be the collides-on-a-placeholder bug again."
	^ self ___display___: message category: cat
		filename: (loc @env0:isNil ifTrue: ['<sys>'] ifFalse: [loc @env0:at: 1])
		lineno: (loc @env0:isNil ifTrue: [0] ifFalse: [loc @env0:at: 2])
%

category: 'Grail-Private'
method: warnings
___checkWarnExplicitArgs___: message _: category _: lineno _: registry
	"warn_explicit's argument checks, shared by the fixed-arity and varargs
	entries.  A four-positional call takes the FIXED-ARITY selector, so
	validating only in the varargs form checked nothing that test
	test_warn_explicit_type_errors actually calls.

	CPython raises here rather than failing later inside the display."

	(lineno @env0:isKindOf: Integer) ifFalse: [
		TypeError ___signal___: 'lineno must be an int'].
	"Either the MESSAGE is already a Warning instance, or the CATEGORY must be
	a Warning subclass -- one of the two has to carry the category."
	((message @env0:isKindOf: AbstractException)
		or: [(category @env0:isKindOf: Behavior)
			and: [category @env0:== Warning
				or: [category @env0:inheritsFrom: Warning]]])
		ifFalse: [
			TypeError ___signal___:
				'category must be a Warning subclass, not '
					@env0:, category @env0:class @env0:name @env0:asString].
	"registry, when given, is a mapping."
	(registry @env0:isNil or: [registry @env0:== None]) ifFalse: [
		(registry @env0:isKindOf: AbstractDictionary) ifFalse: [
			TypeError ___signal___: 'registry must be a dict or None']].
	^ None
%

category: 'Grail-Private'
method: warnings
___blessMyLoader___: moduleGlobals
	"CPython's ``importlib._bootstrap_external._bless_my_loader'', called the
	way _warnings.c calls it.

	``module_globals'' is passed so the warning machinery can fetch the SOURCE
	LINE to display, which means finding the module's loader.  Finding it is
	a compatibility tangle: ``__loader__'' was the original home,
	``__spec__.loader'' replaced it, and globals in the wild carry either,
	both, or a disagreeing pair (gh-86298, gh-97850).

	The rules are not reimplemented here.  They are ordinary Python and two of
	them lean on Python's own comparison semantics -- the sentinel test is
	``spec_loader in (missing, None)'', where ``in'' compares with ``=='', and
	the disagreement test is ``!='' rather than ``is not''.  Written out in
	Smalltalk both would quietly become identity checks.

	Answers nil when the vendored module is not on the search path, which
	leaves warn_explicit doing what it did before: warn, and skip the source
	line."

	| m path |
	m := importlib @env1:lookupModule: 'importlib._bootstrap_external'.
	m == nil ifTrue: [
		path := importlib @env1:___moduleNameToPath___: 'importlib._bootstrap_external'.
		path == nil ifTrue: [^ nil].
		m := importlib @env0:loadModuleFromPath: path
			name: 'importlib._bootstrap_external'].
	^ m @env1:_bless_my_loader: moduleGlobals
%

category: 'Grail-Private'
method: warnings
___resolveModuleGlobals___: moduleGlobals
	"warn_explicit's ``module_globals'' handling: reject the argument, or
	resolve the loader it names.

	Three cases, and the first two are as much the contract as the third.
	None means NOT SUPPLIED and must not crash (bpo-33509).  Anything else
	that is not a dict is a TypeError, raised while binding arguments -- so it
	fires whether or not the warning would have been shown.  A dict, including
	an empty one, goes to _bless_my_loader.

	The loader is answered for symmetry with CPython and then dropped: Grail
	reads source lines off the filesystem rather than through a loader's
	get_source, so nothing downstream needs it.  What the call is FOR is its
	side effects -- the DeprecationWarnings and the two errors."

	| b typeName |
	(moduleGlobals @env0:isNil or: [moduleGlobals @env0:== None])
		ifTrue: [^ nil].
	(moduleGlobals @env0:isKindOf: AbstractDictionary) ifFalse: [
		b := (Python @env0:at: #builtins) @env0:___instance___.
		typeName := (b @env1:type: moduleGlobals) @env1:___pyAttrLoad___: #'__name__'.
		TypeError ___signal___:
			'module_globals must be a dict, not ''' @env0:, typeName @env0:, ''''].
	^ self ___blessMyLoader___: moduleGlobals
%

category: 'Grail-Public'
method: warnings
warn_explicit: message _: category _: filename _: lineno
	"warn_explicit(message, category, filename, lineno) - lower-level
	form used by the C implementation; here it bypasses the dedupe
	for action 'always' and otherwise behaves like warn()."

	^ self warn_explicit: message _: category _: filename _: lineno
		module: nil
%

category: 'Grail-Private'
method: warnings
___registryKey___: text _: cat _: lineno
	"The key a registry dedupes on: CPython's (text, category, lineno).

	Spelled as a string rather than a tuple.  Nothing reads the key -- what
	callers inspect is the SIZE of the registry and the presence of
	``version'' -- and a string hashes the same way in every dictionary Grail
	might be handed, including one built in Python."

	^ text @env0:asString @env0:, '|' @env0:, (self ___categoryName___: cat)
		@env0:, '|' @env0:, lineno @env0:printString
%

category: 'Grail-Private'
method: warnings
___categoryName___: cat
	"A category's name for a registry key.  warn() accepts a category that is
	not a class at all, so this cannot simply be #name."

	(cat @env0:isKindOf: Behavior) ifTrue: [^ cat @env0:name @env0:asString].
	^ cat @env0:printString
%

category: 'Grail-Private'
method: warnings
___prepareRegistry___: registry
	"Bring a registry up to date with the current filters, CPython's way.

	A registry remembers which warnings have already been shown, so changing
	the filters has to invalidate it -- otherwise a warning suppressed under
	the old filters stays suppressed under new ones that would show it.
	CPython stamps a ``version'' into the registry and clears the whole thing
	when it no longer matches _filters_version.

	The stamp is why an IGNORED warning still leaves a mark: the clear-and-
	stamp happens before the filters are consulted, so a registry that caught
	nothing still ends up holding exactly ``version''."

	| version |
	registry @env0:isNil ifTrue: [^ nil].
	version := self _filters_version.
	(registry @env0:at: 'version' ifAbsent: [nil]) @env0:= version ifFalse: [
		"Key by key: both KeyValueDictionary and Grail's PyDict specifically
		disallow #removeAll:."
		registry @env0:keys @env0:asArray @env0:do: [:k |
			registry @env0:removeKey: k ifAbsent: [nil]].
		registry @env0:at: 'version' put: version].
	^ registry
%

category: 'Grail-Private'
method: warnings
___recordAction___: action text: text category: cat lineno: lineno registry: registry
	"The bookkeeping between deciding to show a warning and showing it, and
	the reason the actions differ from one another at all.

	  * ``once''    -- remembered in the MODULE-LEVEL onceregistry under
	                   (text, category), with no filename or line in the key.
	                   That is what makes it once per PROCESS: the same
	                   message from a different file, or a different line of
	                   the same file, is still suppressed.
	  * ``module''  -- remembered under line 0, so it is once per registry
	                   (which is to say, per module) rather than per line.
	  * ``default'' -- remembered under the real line, so each distinct call
	                   site warns once.
	  * ``always''/``all'' -- remembered nowhere; every occurrence shows.

	Answers whether the warning should still be shown."

	| key oncekey altkey |
	(action @env0:= 'always' or: [action @env0:= 'all']) ifTrue: [^ true].
	"A nil lineno means the call site is unknown.  ``once'' is unaffected --
	its key has no line in it -- but ``default'' and ``module'' key ON the
	line, and the safe reading of an unknown one is to dedupe NOTHING rather
	than to file every unlocatable site together.  Showing a warning twice is
	recoverable; swallowing one is not."
	lineno @env0:isNil ifTrue: [
		action @env0:= 'once' ifFalse: [^ true]].
	key := lineno @env0:isNil
		ifTrue: [nil]
		ifFalse: [self ___registryKey___: text _: cat _: lineno].
	action @env0:= 'once' ifTrue: [
		(registry @env0:isNil or: [key @env0:isNil])
			ifFalse: [registry @env0:at: key put: 1].
		oncekey := text @env0:asString @env0:, '|' @env0:, (self ___categoryName___: cat).
		((self onceregistry) @env0:at: oncekey ifAbsent: [nil]) @env0:isNil
			ifFalse: [^ false].
		(self onceregistry) @env0:at: oncekey put: 1.
		^ true].
	action @env0:= 'module' ifTrue: [
		registry @env0:isNil ifTrue: [^ true].
		registry @env0:at: key put: 1.
		altkey := self ___registryKey___: text _: cat _: 0.
		(registry @env0:at: altkey ifAbsent: [nil]) @env0:isNil ifFalse: [^ false].
		registry @env0:at: altkey put: 1.
		^ true].
	action @env0:= 'default' ifTrue: [
		registry @env0:isNil ifFalse: [registry @env0:at: key put: 1].
		^ true].
	"An action that reached here is not one of the seven, which means the
	filter list holds something filterwarnings would have rejected."
	^ RuntimeError ___signal___:
		'Unrecognized action (' @env0:, action @env0:printString
			@env0:, ') in warnings.filters'
%

category: 'Grail-Public'
method: warnings
warn_explicit: message _: category _: filename _: lineno module: module
	"warn_explicit with the MODULE a filter's ``module'' pattern is matched
	against.

	CPython derives it from the filename when the caller does not say -- the
	filename with a trailing ``.py'' stripped, and ``<unknown>'' when there is
	no filename at all.  So ``filterwarnings('always', module=r'package')''
	applies to a warning explicitly attributed to package.module AND to one
	whose file is /path/to/package/module.py, which is the point: the two are
	the same module named two ways.

	Grail passed nothing, so a module-scoped filter could never be shown to
	apply here and was skipped."

	^ self warn_explicit: message _: category _: filename _: lineno
		module: module registry: nil
%

category: 'Grail-Public'
method: warnings
warn_explicit: message _: category _: filename _: lineno module: module registry: registry
	"warn_explicit with the REGISTRY it dedupes through.

	The registry is a plain dict remembering which warnings have already been
	shown.  CPython threads the CALLER's ``__warningregistry__'' through it,
	which is what makes ``default'' mean once per call site rather than once
	ever, and it is checked BEFORE the filters -- a warning already recorded
	there never reaches the filter list at all.

	Grail had no registry: it deduped through one module-global table keyed by
	(text, category), so ``default'' meant once per PROCESS, and passing
	registry= did nothing at all.  A caller who supplies one now gets it used
	and stamped."

	| cat action mod reg text key |
	self ___checkWarnExplicitArgs___: message _: category _: lineno _: registry.
	cat := self ___categoryFor___: message _: category.
	mod := self ___moduleFor___: module _: filename.
	text := self ___messageText___: message.
	reg := (registry @env0:isNil or: [registry @env0:== None])
		ifTrue: [nil] ifFalse: [registry].
	self ___prepareRegistry___: reg.
	key := self ___registryKey___: text _: cat _: lineno.
	"The quick test, and it comes FIRST -- before the filters, not after."
	(reg @env0:notNil and: [(reg @env0:at: key ifAbsent: [nil]) @env0:notNil])
		ifTrue: [^ None].
	action := self ___actionFor___: message _: cat _: mod _: lineno.
	"``ignore'' returns without recording anything: there is nothing to
	remember about a warning that was never shown."
	action @env0:= 'ignore' ifTrue: [^ None].
	action @env0:= 'error' ifTrue: [^ cat ___signal___: message].
	(self ___recordAction___: action text: text category: cat
		lineno: lineno registry: reg) ifFalse: [^ None].
	^ self ___display___: message category: cat
		filename: filename lineno: lineno
%

category: 'Grail-Private'
method: warnings
___moduleFor___: module _: filename
	"The module name a filter's ``module'' pattern is matched against."

	| mod |
	(module @env0:isNil or: [module @env0:== None]) ifFalse: [^ module].
	mod := (filename @env0:isNil or: [filename @env0:== None])
		ifTrue: ['<unknown>'] ifFalse: [filename @env0:asString].
	mod @env0:isEmpty ifTrue: [^ '<unknown>'].
	(mod @env0:size @env0:>= 3
		and: [(mod @env0:copyFrom: mod @env0:size @env0:- 2 to: mod @env0:size)
			@env0:asLowercase @env0:= '.py'])
		ifTrue: [^ mod @env0:copyFrom: 1 to: mod @env0:size @env0:- 3].
	^ mod
%

category: 'Grail-Public'
method: warnings
_use_context
	"3.14: true when the filter state is CONTEXT-local (a ContextVar) rather
	than module-global.  Grail's filters are module-global, and the flag that
	turns the context machinery on -- sys.flags.context_aware_warnings -- is 0
	here as it is in a default CPython build, so this is false.

	Not cosmetic: test_warnings branches on it in the helper that every filter
	test runs through, taking either _new_context/_set_context or a
	save-and-restore of ``filters''.  Without the attribute the read raised and
	ten tests died before doing anything."

	^ false
%

category: 'Grail-Private'
method: warnings
___categoryFor___: message _: category
	"The category a warning is FILTERED under.

	CPython: ``if isinstance(message, Warning): category = message.__class__''
	-- unconditionally, in both warn() and warn_explicit(), and it overrides
	any category that was passed alongside.  A warning raised as an INSTANCE
	carries its own class, and that class is the one the caller meant.

	Grail defaulted to UserWarning instead, so ``warn(FutureWarning('boom'))''
	was filtered as a UserWarning: a filter installed for FutureWarning never
	matched it, and an 'error' filter for that category did not fire."

	(message @env0:isKindOf: Warning) ifTrue: [^ message @env0:class].
	^ self _resolveCategory: category
%

category: 'Grail-Private'
method: warnings
___display___: message category: cat filename: filename lineno: lineno
	"What happens to a warning the filters decided to SHOW.  CPython's
	_showwarnmsg, and the order is the whole content of it:

	  1. a REPLACED showwarning wins outright;
	  2. otherwise a recorder, if one is active, captures it;
	  3. otherwise the built-in display writes it out.

	Grail had 1 and 2 the other way round, and that is observable rather
	than academic: assigning showwarning INSIDE a catch_warnings(record=True)
	block is a documented thing to do (issue #28835), and with the recorder
	checked first the assignment silently did nothing -- the warning went to
	the log the caller had stopped reading.

	The recorder is second, not first, for the same reason it is in CPython:
	catch_warnings(record=True) records by REPLACING the display, so anything
	that replaces the display again after it takes precedence."

	| hook recList shownFile shownLine inst |
	"CPython hands a Warning INSTANCE to everything downstream, never the raw
	text: showwarning's first argument is one, and so is WarningMessage's
	``message''.  The recorder coerced it and the hook path did not, so an
	override written the ordinary way -- reading ``message.args[0]'' -- got a
	str and raised.  Coerce once, here, so all three routes agree."
	inst := message.
	((inst @env0:isKindOf: AbstractException) @env0:not
		and: [(cat @env0:isKindOf: Behavior)
			and: [cat @env0:== Warning or: [cat @env0:inheritsFrom: Warning]]])
		ifTrue: [
			"Only a real Warning subclass can be instantiated.  warn() accepts
			a category that is neither -- test_warning_classes passes a string
			on purpose -- and such a warning keeps its message as it came."
			inst := cat @env1:___new___.
			inst @env1:___args___: { message }].
	"An unresolvable location is recorded as nil -- a WarningMessage says it
	does not know -- but DISPLAYED as ``<unknown>:0'', because the rendering
	has to put something on the line."
	shownFile := filename @env0:isNil ifTrue: ['<unknown>'] ifFalse: [filename].
	shownLine := lineno @env0:isNil ifTrue: [0] ifFalse: [lineno].
	hook := self ___overriddenHook___: #'showwarning'.
	hook ~~ nil ifTrue: [
		"A documented hook, so a caller may have replaced it with something
		that is not callable.  CPython raises at the point of use rather
		than failing obscurely inside the display."
		(((Python @env0:at: #builtins) @env0:___instance___)
			@env1:callable: hook) @env0:== true ifFalse: [
				^ TypeError ___signal___:
					'showwarning() argument must be callable'].
		^ hook @env1:value: { inst. cat. shownFile. shownLine } value: nil].
	recList := self _recordList.
	recList == nil ifFalse: [
		recList @env0:add: (WarningMessage
			@env0:___message___: inst category: cat
			filename: filename lineno: lineno).
		^ None].
	^ self showwarning: inst _: cat _: shownFile _: shownLine _: nil _: nil
%

category: 'Grail-Private'
method: warnings
___overriddenHook___: aName
	"The hook a CALLER installed under ``aName'', or nil when what is there
	is the module's own method.

	The distinction cannot be ``is an attribute bound'', which is what this
	used to be, because merely READING ``warnings.showwarning'' binds one:
	the attribute machinery memoises the BoundMethod it builds into the same
	store a Python assignment writes to.  So a test that only LOOKS at the
	hook installed one, and from then on every warning was dispatched through
	``an override'' that was in fact the built-in -- which meant a recorder
	sitting behind it never saw anything, and the warning went to the
	Transcript instead of to the caller's log.

	A memoised BoundMethod is recognisable: it is bound to THIS module and
	carries the same selector.  Anything else -- a function, a lambda, an
	arbitrary object, a bound method of something else -- is a real override.
	CPython has the same question in a different shape and answers it the
	same way, by keeping the original and testing identity."

	| v |
	v := self ___moduleHook___: aName.
	v @env0:isNil ifTrue: [^ nil].
	((v @env0:isKindOf: BoundMethod)
		and: [((v @env0:receiver) @env0:== self)
			and: [(v @env0:selector) @env0:== aName @env0:asSymbol]])
		ifTrue: [^ nil].
	^ v
%

category: 'Grail-Private'
method: warnings
___moduleHook___: aName
	"A module attribute a caller may have REPLACED -- ``showwarning'',
	``formatwarning'', ``filters'' -- or nil when it is still whatever the
	module itself provides.

	Both stores, IN PYTHON'S ORDER.  A module attribute has two possible
	homes: a Python-level ``warnings.showwarning = f'' lands in the
	dynamic-instVar holder, while Smalltalk's ``self at: #name put:'' lands
	in the SymbolDictionary.  Attribute reads answer the dynamic-instVar
	one when both exist, so a reader that checks the SymbolDictionary first
	disagrees with what Python sees -- which is what this used to do."

	| dyn |
	dyn := [self @env0:dynamicInstVarAt: aName]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	dyn @env0:isNil ifFalse: [^ dyn].
	^ self @env0:at: aName ifAbsent: [nil]
%

category: 'Grail-Private'
method: warnings
___setModuleHook___: aName to: aValue
	"Bind a module attribute the way PYTHON binds one: in the dynamic-instVar
	holder, and nowhere else.

	The SymbolDictionary is not an alternative here.  ``showwarning'' is a
	real Smalltalk method, and an attribute read finds the method before it
	looks in the SymbolDictionary -- so a value put there is invisible, and
	restoring a saved showwarning that way silently restored the built-in
	instead.  The dynamic-instVar holder is what an attribute read consults
	first, which is exactly what shadowing a method requires.  Any stale
	SymbolDictionary entry is dropped so the attribute has one home."

	self @env0:removeKey: aName ifAbsent: [nil].
	self @env0:dynamicInstVarAt: aName put: aValue.
	^ aValue
%

category: 'Grail-Private'
method: warnings
___setFilters___: aList
	"Bind ``filters'' in BOTH stores, which is the one place that is right.

	``del warnings.filters'' is legal and must not break filtering -- CPython
	keeps its own reference and carries on, and test_filter checks exactly
	that.  A Python delete only reaches the dynamic-instVar holder, so
	leaving the same list in the SymbolDictionary as well gives the read a
	place to land: the attribute disappears, the filtering does not."

	self @env0:dynamicInstVarAt: #filters put: aList.
	self @env0:at: #filters put: aList.
	^ aList
%

category: 'Grail-Private'
method: warnings
___clearModuleHook___: aName
	"Unbind a module attribute from both stores, leaving whatever the module
	itself provides -- for ``showwarning'' that is the built-in method, which
	is what a reader gets back once nothing shadows it."

	[self @env0:removeDynamicInstVar: aName]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	self @env0:removeKey: aName ifAbsent: [nil].
	^ nil
%

category: 'Grail-Private'
method: warnings
___sourceLine___: filename _: lineno
	"The source line a warning points at, for the second line of the display.

	linecache is what CPython uses and it caches by (filename, mtime), so
	repeating a warning does not re-read the file.  Any failure here answers
	nil: a warning about missing source is worse than a warning without it,
	which is why CPython wraps this in a bare except too."

	| lc |
	(filename @env0:isNil or: [lineno @env0:isNil]) ifTrue: [^ nil].
	^ [
		lc := ((Python @env0:at: #importlib) @env0:___instance___)
			@env1:import_module: 'linecache'.
		lc @env1:getline: filename @env0:asString _: lineno]
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil]
%

category: 'Grail-Public'
method: warnings
showwarning: message _: category _: filename _: lineno
	"showwarning(message, category, filename, lineno) - the hook that WRITES
	a warning, kept separate from the decision to write it.  Replacing it is
	the documented way to redirect warning output."

	^ self showwarning: message _: category _: filename _: lineno
		_: nil _: nil
%

category: 'Grail-Public'
method: warnings
showwarning: message _: category _: filename _: lineno _: file _: line
	"showwarning(message, category, filename, lineno, file=None, line=None).

	``file'' is the whole point of the signature and Grail used to drop it,
	writing to the Transcript unconditionally.  That is not a cosmetic
	difference: capturing warning output is how a test reads what was
	displayed, and with the argument ignored every such capture came back
	EMPTY -- the warning had gone to the Transcript, where nothing was
	looking.

	Where it goes, in CPython's order: the ``file'' argument, else
	sys.stderr.  CPython gives up when sys.stderr is None (it happens under
	pythonw.exe) and the warning is simply lost.  Grail does NOT, because its
	sys.stderr is None by DEFAULT -- giving up would lose every warning
	Grail ever displays -- so the Transcript remains the last resort rather
	than the first choice."

	| text target fmt shown |
	"A REPLACED formatwarning is called with the line as a fifth POSITIONAL
	argument, not as a keyword (bpo-35178)."
	fmt := self ___overriddenHook___: #'formatwarning'.
	text := fmt @env0:isNil
		ifTrue: [self formatwarning: message _: category _: filename
			_: lineno _: line]
		ifFalse: [(fmt @env1:value: { message. category. filename. lineno.
			line } value: nil) @env0:asString].
	target := file.
	(target @env0:isNil or: [target @env0:== None]) ifTrue: [
		target := ((Python @env0:at: #sys) @env0:___instance___)
			@env1:___pyAttrLoad___: #'stderr'].
	(target @env0:isNil or: [target @env0:== None]) ifTrue: [
		"The text already ends in a newline; the console wants the line
		without it and a cr, which is what it got before any of this.
		The console is the session-local #GrailConsole override when an
		embedder installed one, else the global Transcript -- the same
		lookup as builtins ___console___ (see its comment for why the
		override exists and why it is stored BOXED in an Array), made
		inline so this file does not depend on builtins being loaded."
		| console |
		console := SessionTemps @env0:current
			@env0:at: #'GrailConsole' otherwise: nil.
		console := console == nil
			ifTrue: [Transcript]
			ifFalse: [console @env0:at: 1].
		shown := text.
		(shown @env0:isEmpty @env0:not
			and: [(shown @env0:last) @env0:== Character @env0:lf]) ifTrue: [
				shown := shown @env0:copyFrom: 1 to: shown @env0:size @env0:- 1].
		console @env0:nextPutAll: shown.
		console @env0:cr.
		^ None].
	"CPython swallows OSError here -- an invalid stderr loses the warning
	rather than raising inside unrelated code."
	[target @env1:write: text]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	^ None
%

category: 'Grail-Public'
method: warnings
_showwarning: positional kw: kwargs
	"Varargs showwarning: CPython's signature carries optional ``file'' and
	``line'' after the four required arguments, positionally or by keyword.
	Both are now honoured -- see the six-argument showwarning for what they
	mean and why ignoring ``file'' made every capture of warning output come
	back empty."

	| file line |
	positional @env0:size @env0:< 4 ifTrue: [
		TypeError ___signal___:
			'showwarning() missing required arguments'].
	file := (kwargs ~~ nil and: [kwargs @env0:includesKey: 'file'])
		ifTrue: [kwargs @env0:at: 'file']
		ifFalse: [positional @env0:size @env0:>= 5
			ifTrue: [positional @env0:at: 5] ifFalse: [nil]].
	line := (kwargs ~~ nil and: [kwargs @env0:includesKey: 'line'])
		ifTrue: [kwargs @env0:at: 'line']
		ifFalse: [positional @env0:size @env0:>= 6
			ifTrue: [positional @env0:at: 6] ifFalse: [nil]].
	^ self
		showwarning: (positional @env0:at: 1)
		_: (positional @env0:at: 2)
		_: (positional @env0:at: 3)
		_: (positional @env0:at: 4)
		_: file
		_: line
%

category: 'Grail-Public'
method: warnings
_warn_explicit: positional kw: kwargs
	"Varargs warn_explicit.  CPython's full signature is

		warn_explicit(message, category, filename, lineno,
		              module=None, registry=None, module_globals=None,
		              source=None)

	``module_globals'' is acted on -- see ___resolveModuleGlobals___.  Of the
	rest, ``module'' and ``source'' are accepted and ignored, and ``registry''
	is validated but not consulted: Grail's dedupe is module-global rather
	than per-module.  Before any of this, a call passing one of them
	(``module='package.module''' is the common shape) failed argument binding
	outright."

	| msg cat lineno reg mg |
	positional @env0:size @env0:< 4 ifTrue: [
		TypeError ___signal___:
			'warn_explicit() missing required arguments'].
	msg := positional @env0:at: 1.
	cat := positional @env0:at: 2.
	lineno := positional @env0:at: 4.
	reg := (kwargs ~~ nil and: [kwargs @env0:includesKey: 'registry'])
		ifTrue: [kwargs @env0:at: 'registry'] ifFalse: [nil].
	self ___checkWarnExplicitArgs___: msg _: cat _: lineno _: reg.
	"``module_globals'' is positional 7 as well as a keyword, and its checks
	run BEFORE the warning is shown -- an unusable __spec__.loader raises
	instead of warning, and the DeprecationWarning it may emit has to arrive
	first."
	mg := (kwargs ~~ nil and: [kwargs @env0:includesKey: 'module_globals'])
		ifTrue: [kwargs @env0:at: 'module_globals']
		ifFalse: [positional @env0:size @env0:>= 7
			ifTrue: [positional @env0:at: 7] ifFalse: [nil]].
	self ___resolveModuleGlobals___: mg.
	^ self
		warn_explicit: msg
		_: cat
		_: (positional @env0:at: 3)
		_: lineno
		module: ((kwargs ~~ nil and: [kwargs @env0:includesKey: 'module'])
			ifTrue: [kwargs @env0:at: 'module']
			ifFalse: [positional @env0:size @env0:>= 5
				ifTrue: [positional @env0:at: 5] ifFalse: [nil]])
		registry: reg
%

category: 'Grail-Public'
method: warnings
formatwarning: message _: category _: filename _: lineno
	"formatwarning(message, category, filename, lineno)."

	^ self formatwarning: message _: category _: filename _: lineno _: nil
%

category: 'Grail-Display'
method: warnings
formatwarning: message _: category _: filename _: lineno _: line
	"formatwarning(message, category, filename, lineno, line=None) - CPython's
	default rendering, which is TWO lines:

		<file>:<lineno>: <Category>: <message>
		  <the source line>

	Grail rendered only the first, and without the trailing newline.  The
	second line is not decoration -- it is how a warning reported against a
	deep frame tells you what the code there actually said -- and its absence
	is visible to anything that parses the output.

	``line'' overrides the lookup; None means read it from the file.  An
	empty result (no such file, no such line) drops the second line rather
	than printing a blank one."

	| stream src text |
	"CPython renders str(message), and the message is normally a Warning
	INSTANCE rather than text.  Smalltalk's asString on an exception answers
	its GemStone description (``a UserWarning occurred (error 2702)''), so
	going through __str__ is not a refinement here -- it is the difference
	between the warning's text and a description of the exception object."
	text := [message @env1:__str__]
		@env0:on: AbstractException do: [:ex |
			ex @env0:return: message @env0:asString].
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	stream @env0:nextPutAll: filename @env0:asString.
	stream @env0:nextPut: $:.
	stream @env0:nextPutAll: lineno @env0:printString.
	stream @env0:nextPutAll: ': '.
	stream @env0:nextPutAll: (self ___categoryName___: category).
	stream @env0:nextPutAll: ': '.
	stream @env0:nextPutAll: text @env0:asString.
	stream @env0:nextPut: Character @env0:lf.
	src := line.
	(src @env0:isNil or: [src @env0:== None]) ifTrue: [
		src := self ___sourceLine___: filename _: lineno].
	(src @env0:isNil or: [src @env0:== None]) ifFalse: [
		src := src @env0:asString.
		"CPython tests the RAW line for truth and prints the STRIPPED one, so
		a whitespace-only line still produces its (empty) second line."
		src @env0:isEmpty ifFalse: [
			stream @env0:nextPutAll: '  '.
			stream @env0:nextPutAll: src @env0:trimSeparators.
			stream @env0:nextPut: Character @env0:lf]].
	^ stream @env0:contents
%

category: 'Grail-Display'
method: warnings
_formatwarning: positional kw: kwargs
	"Varargs formatwarning: the optional ``line'' is a fifth positional
	argument as well as a keyword, and test_warnings passes it both ways."

	| line |
	positional @env0:size @env0:< 4 ifTrue: [
		TypeError ___signal___:
			'formatwarning() missing required arguments'].
	line := (kwargs ~~ nil and: [kwargs @env0:includesKey: 'line'])
		ifTrue: [kwargs @env0:at: 'line']
		ifFalse: [positional @env0:size @env0:>= 5
			ifTrue: [positional @env0:at: 5] ifFalse: [nil]].
	^ self
		formatwarning: (positional @env0:at: 1)
		_: (positional @env0:at: 2)
		_: (positional @env0:at: 3)
		_: (positional @env0:at: 4)
		_: line
%

category: 'Grail-Private'
method: warnings
___reModule___
	"The regex engine, imported on demand.

	CPython COMPILES a filter's message and module patterns at
	filterwarnings() time and stores the pattern objects in the filter tuple.
	Grail used to store the raw strings and test them with a SUBSTRING match,
	which is a different predicate in both directions: CPython's #match is
	anchored at the start, so ``match'' does not apply to ``suffix match'' --
	but it is a REGEX, so ``hex*'' does apply to ``hex/oct''.  A filter list
	that got either wrong silently escalates or silently ignores."

	^ ((Python @env0:at: #importlib) @env0:___instance___)
		@env1:import_module: 're'
%

category: 'Grail-Private'
method: warnings
___compilePattern___: aString
	"A filter pattern, compiled -- or nil for the empty pattern, which means
	``no constraint'' rather than ``matches only the empty string''."

	| re |
	(aString @env0:isNil or: [aString @env0:== None]) ifTrue: [^ nil].
	aString @env0:isEmpty ifTrue: [^ nil].
	re := self ___reModule___.
	"Messages are matched case-INSENSITIVELY and modules are not; the caller
	passes the flag it wants."
	^ re @env1:_compile: { aString } kw: nil
%

category: 'Grail-Private'
method: warnings
___compileMessagePattern___: aString
	"As above, with re.I -- CPython compiles the MESSAGE pattern
	case-insensitively and the MODULE pattern case-sensitively."

	| re |
	(aString @env0:isNil or: [aString @env0:== None]) ifTrue: [^ nil].
	aString @env0:isEmpty ifTrue: [^ nil].
	re := self ___reModule___.
	^ re @env1:_compile: { aString. re @env1:___pyAttrLoad___: #'I' } kw: nil
%

category: 'Grail-Private'
method: warnings
___validateFilter___: action _: message _: category _: module _: lineno
	"filterwarnings' argument checks, which are load-bearing rather than
	decorative: a misspelled action silently matches nothing, and the
	resulting filter sits in the list doing the opposite of what was asked."

	| valid |
	valid := #('default' 'always' 'all' 'ignore' 'module' 'once' 'error').
	(valid @env0:includes: action @env0:asString) ifFalse: [
		^ ValueError ___signal___:
			'invalid action: ' @env0:, action @env0:printString].
	(message @env0:isNil or: [message @env0:== None
		or: [message @env0:isKindOf: CharacterCollection]]) ifFalse: [
			^ TypeError ___signal___: 'message must be a string'].
	(category @env0:isNil or: [category @env0:== None]) ifFalse: [
		"``a type, and a Warning subclass'' -- int is the first half only,
		and 0 is neither."
		((category @env0:isKindOf: Behavior)
			and: [category @env0:== Warning
				or: [category @env0:inheritsFrom: Warning]]) ifFalse: [
					^ TypeError ___signal___:
						'category must be a Warning subclass']].
	(module @env0:isNil or: [module @env0:== None
		or: [module @env0:isKindOf: CharacterCollection]]) ifFalse: [
			^ TypeError ___signal___: 'module must be a string'].
	(lineno @env0:isKindOf: Integer) ifFalse: [
		^ TypeError ___signal___: 'lineno must be an int'].
	lineno @env0:< 0 ifTrue: [
		^ ValueError ___signal___: 'lineno must be an int >= 0'].
	^ nil
%

category: 'Grail-Private'
method: warnings
___addFilter___: anItem append: appendFlag
	"CPython's _add_filter, and the reason it is not just ``insert at front''.

	A filter EQUAL to the new one is removed first, so re-adding an existing
	filter PROMOTES it rather than leaving a stale copy behind that a later
	walk would find first.  With append=True the opposite holds: an existing
	equal filter means there is nothing to do, because appending would put it
	in the wrong place.

	Grail's simplefilter used to CLEAR the whole list instead.  That reads
	like a stronger version of the same thing and is not: it throws away
	filters the caller installed deliberately, and it makes append meaningless."

	| filters existing |
	filters := self _filters.
	existing := nil.
	filters @env0:do: [:f |
		(existing @env0:isNil and: [self ___filtersEqual___: f _: anItem])
			ifTrue: [existing := f]].
	appendFlag @env0:== true
		ifTrue: [
			existing @env0:isNil ifTrue: [filters @env0:addLast: anItem]]
		ifFalse: [
			existing @env0:isNil ifFalse: [filters @env0:remove: existing ifAbsent: [nil]].
			filters @env0:addFirst: anItem].
	self ___filtersMutated___.
	^ None
%

category: 'Grail-Private'
method: warnings
___filtersEqual___: a _: b
	"Tuple equality, elementwise, the way CPython compares filters.

	Classes and compiled patterns compare by identity, strings and integers
	by value, and anything that refuses to answer #= at all is treated as
	unequal rather than allowed to raise inside filterwarnings."

	| n |
	(a @env0:isNil or: [b @env0:isNil]) ifTrue: [^ false].
	n := a @env0:size.
	n @env0:= b @env0:size ifFalse: [^ false].
	1 @env0:to: n do: [:i |
		| x y same |
		x := a @env0:at: i.
		y := b @env0:at: i.
		same := x @env0:== y.
		same ifFalse: [
			same := [x @env0:= y] @env0:on: AbstractException
				do: [:ex | ex @env0:return: false]].
		same ifFalse: [^ false]].
	^ true
%

category: 'Grail-Private'
method: warnings
___filtersMutated___
	"The filter list changed, so the per-warning dedupe state is stale.

	CPython bumps _filters_version and lets each __warningregistry__ notice
	on next use; Grail keeps one module-global dedupe map, so the equivalent
	is to drop it."

	self @env0:at: #_seen put: KeyValueDictionary @env0:new.
	"Bump the version too.  A registry stamps it and clears itself when it no
	longer matches, so a version that never moves means a warning suppressed
	under the old filters stays suppressed under new ones that would show it."
	self _filters_version: self _filters_version @env0:+ 1.
	^ None
%

category: 'Grail-Filters'
method: warnings
simplefilter: action
	"simplefilter(action) - drop all filters and install one matching
	every category and message."

	^ self simplefilter: action _: nil
%

category: 'Grail-Filters'
method: warnings
simplefilter: action _: category
	"simplefilter(action, category=Warning) - install a filter matching every
	message of ``category''.

	It does NOT clear the list, which is what this used to do.  CPython
	inserts at the front, where the new filter wins anyway, and keeping the
	rest matters: resetwarnings() is the call that clears, append=True has no
	meaning against an emptied list, and a caller who installed a filter
	deliberately does not expect the next simplefilter to discard it."

	^ self
		___addFilter___: action
		message: nil
		category: category
		module: nil
		lineno: 0
		append: false
%

category: 'Grail-Filters'
method: warnings
_simplefilter: positional kw: kwargs
	"Varargs entry for simplefilter(action, category=...) -- the fixed-
	arity simplefilter:/simplefilter:_: pair is positional-only, so a
	call passing category by keyword (test_tzinfo_utcfromtimestamp's
	``simplefilter('ignore', category=DeprecationWarning)'') falls
	through to here (see PyDateTime>>_now:kw: for why)."

	| n action category lineno append |
	n := positional @env0:size.
	"``action'' may arrive by keyword here too -- simplefilter(action='foo')
	is how test_argument_validation checks the invalid-action ValueError, and
	demanding it positionally answered a TypeError about a missing argument
	instead."
	n @env0:< 1 ifTrue: [
		(kwargs @env0:notNil and: [kwargs @env0:includesKey: 'action']) ifFalse: [
			TypeError ___signal___:
				'simplefilter() missing required argument: ''action''']].
	n @env0:> 4 ifTrue: [
		TypeError ___signal___: ('simplefilter() takes at most 4 arguments (' @env0:,
			n @env0:printString @env0:, ' given)')].
	action := n @env0:>= 1
		ifTrue: [positional @env0:at: 1]
		ifFalse: [kwargs @env0:at: 'action'].
	category := n @env0:>= 2 ifTrue: [positional @env0:at: 2] ifFalse: [nil].
	lineno := n @env0:>= 3 ifTrue: [positional @env0:at: 3] ifFalse: [0].
	append := n @env0:>= 4 ifTrue: [positional @env0:at: 4] ifFalse: [false].
	"``lineno'' and ``append'' are part of the signature, not extras: without
	them simplefilter('error', append=True) is a TypeError, which is how
	test_append_duplicate fails before it can test anything."
	kwargs ifNotNil: [
		kwargs @env0:keysAndValuesDo: [:k :v | | key |
			key := k @env0:asString.
			key @env0:= 'action' ifTrue: [nil] ifFalse: [
			key @env0:= 'category' ifTrue: [category := v] ifFalse: [
			key @env0:= 'lineno' ifTrue: [lineno := v] ifFalse: [
			key @env0:= 'append' ifTrue: [append := v] ifFalse: [
				TypeError ___signal___:
					('simplefilter() got an unexpected keyword argument ''' @env0:,
						key @env0:, '''')]]]]]].
	^ self
		___addFilter___: action
		message: nil
		category: category
		module: nil
		lineno: lineno
		append: append
%

category: 'Grail-Filters'
method: warnings
_filterwarnings: positional kw: kwargs
	"filterwarnings(action, message='', category=Warning, module='',
	lineno=0, append=False) -- CPython's full signature, by position or by
	keyword.

	Only the fixed-arity positional forms existed, so
	``filterwarnings('error', module='<test string>')'' -- which
	test_global's setUp calls for every one of its 20 tests -- raised
	``takes a different number of arguments'' and errored the whole
	module.

	``module'' and ``lineno'' are RECORDED BUT NOT MATCHABLE: Grail does
	not track which module or line a warning came from, so a filter
	naming one cannot be shown to apply.  Such a filter is therefore
	SKIPPED rather than treated as matching everything -- see
	_actionFor:_: for why that direction is the safe one."

	| n action message category module lineno append kwAt |
	kwAt := [:name :dflt |
		(kwargs @env0:notNil and: [kwargs @env0:includesKey: name])
			@env0:ifTrue: [kwargs @env0:at: name]
			@env0:ifFalse: [dflt]].
	n := positional @env0:size.
	"``action'' is an ordinary parameter, so it may arrive by KEYWORD --
	filterwarnings(action='foo') is exactly how test_argument_validation
	checks that an invalid action is rejected, and requiring it positionally
	turned that ValueError into a TypeError about a missing argument."
	n @env0:< 1 ifTrue: [
		(kwargs @env0:notNil and: [kwargs @env0:includesKey: 'action']) ifFalse: [
			TypeError ___signal___:
				'filterwarnings() missing required argument ''action'' (pos 1)']].
	action := n @env0:>= 1
		ifTrue: [positional @env0:at: 1]
		ifFalse: [kwargs @env0:at: 'action'].
	message := n @env0:>= 2 ifTrue: [positional @env0:at: 2] ifFalse: [kwAt value: 'message' value: nil].
	category := n @env0:>= 3 ifTrue: [positional @env0:at: 3] ifFalse: [kwAt value: 'category' value: nil].
	module := n @env0:>= 4 ifTrue: [positional @env0:at: 4] ifFalse: [kwAt value: 'module' value: nil].
	lineno := n @env0:>= 5 ifTrue: [positional @env0:at: 5] ifFalse: [kwAt value: 'lineno' value: 0].
	append := n @env0:>= 6 ifTrue: [positional @env0:at: 6] ifFalse: [kwAt value: 'append' value: false].
	"Pass message and module through RAW.  Normalising them here ran
	``0 asString'' first, so filterwarnings('ignore', message=0) arrived at
	the checks as the string '0' and was accepted -- the type error the
	argument has to raise had already been erased.  Empty-means-no-constraint
	is handled where the pattern is compiled."
	^ self
		___addFilter___: action
		message: message
		category: ((category @env0:== nil or: [category @env0:== None])
			ifTrue: [nil] ifFalse: [category])
		module: module
		lineno: lineno
		append: append
%

category: 'Grail-Filters'
method: warnings
___emptyPatternToNil___: aPattern
	"CPython's message/module default is the EMPTY regex, which matches
	every string -- so an empty pattern is 'no constraint', not 'matches
	only the empty string'.  nil is how this filter list spells that."

	(aPattern @env0:== nil or: [aPattern @env0:== None]) ifTrue: [^ nil].
	aPattern @env0:asString @env0:isEmpty ifTrue: [^ nil].
	^ aPattern @env0:asString
%

category: 'Grail-Filters'
method: warnings
___addFilter___: action message: msg category: cat module: mod lineno: lineno append: append
	"Install a filter.  Positions 1-3 stay exactly as they were so the
	3-element filters simplefilter and the fixed-arity forms build keep
	working unchanged; module and lineno are appended.

	``append=True'' puts the filter at the END of the list, where it is
	consulted last -- the whole point of the flag, and previously
	unavailable at any arity."

	| f ln |
	ln := (lineno @env0:isNil or: [lineno @env0:== None]) ifTrue: [0] ifFalse: [lineno].
	self ___validateFilter___: action _: msg _: cat _: mod _: ln.
	"CPYTHON'S TUPLE ORDER: (action, message, category, module, lineno).
	Grail used to put the category second and the message third -- the same
	five fields in a different order, invisible while nothing outside
	warnings.gs read the list, and wrong the moment something did.
	_py_warnings' _add_filter and test_warnings both index these positions
	directly, so the ORDER is the interop contract."
	f := {
		action.
		self ___compileMessagePattern___: msg.
		(cat @env0:isNil or: [cat @env0:== None]) ifTrue: [Warning] ifFalse: [cat].
		self ___compilePattern___: mod.
		ln }.
	^ self ___addFilter___: f append: (append @env0:== true or: [append @env0:== 1])
%

category: 'Grail-Filters'
method: warnings
filterwarnings: action
	"filterwarnings(action) - add a filter matching every warning."

	^ self filterwarnings: action _: nil _: nil
%

category: 'Grail-Filters'
method: warnings
filterwarnings: action _: messageSubstring
	"filterwarnings(action, message_pattern) - add a filter scoped
	to messages containing `messageSubstring`."

	^ self filterwarnings: action _: messageSubstring _: nil
%

category: 'Grail-Filters'
method: warnings
filterwarnings: action _: messageSubstring _: category
	"filterwarnings(action, message, category) - add a filter.

	Routed through the same door as the keyword form rather than building the
	tuple here.  Building it here meant the message pattern went in as a RAW
	STRING while the keyword form put in a compiled one, so the same filter
	behaved differently depending on how it had been installed -- and the
	string form matched nothing at all once matching became a real #match."

	^ self
		___addFilter___: action
		message: messageSubstring
		category: category
		module: nil
		lineno: 0
		append: false
%

category: 'Grail-Filters'
method: warnings
resetwarnings
	"resetwarnings() - clear all installed filters."

	(self _filters) @env0:removeAll: (self _filters) @env0:copy.
	^ self ___filtersMutated___
%

category: 'Grail-Filters'
method: warnings
_resetwarnings: positional kw: kwargs
	"Varargs entry for resetwarnings().

	Every other public entry already had one; this was the last zero-argument
	callable without.  It matters because a call through a VARIABLE --
	``self.module.resetwarnings()'', which is how test_warnings reaches every
	implementation under test -- compiles to attribute-load-then-call rather
	than a direct send.  The load auto-invoked the unary method, which answers
	None, and the call then landed on None: ``'NoneType' object is not
	callable'', twenty-one times over."

	^ self resetwarnings
%

category: 'Grail-Catch warnings'
method: warnings
catch_warnings
	"catch_warnings() - context manager that snapshots filter state
	on __enter__ and restores it on __exit__.  Returns a small
	wrapper whose __enter__ saves the current filter list and __exit__
	puts it back."

	^ (CatchWarnings @env0:new) @env0:_owner: self
%

category: 'Grail-Catch warnings'
method: warnings
_catch_warnings: positional kw: kwargs
	"catch_warnings(record=..., ...) -- the kwargs form.

	``record'' is now honoured: with it true, __enter__ answers a live list of
	WarningMessage records rather than the context manager.  Other keywords
	(action / category / module, CPython's 3.11 shorthands for installing a
	filter) are accepted and ignored -- a caller passing one still gets the
	save-and-restore, which is the part they are relying on.

	This selector also has to exist for its own sake: without it the call fell
	back to attr-load + call, the unary method auto-invoked on the load, and
	the CatchWarnings INSTANCE got called -- TypeError 'not callable', 22
	test_set tests."

	| rec action cat lineno append spec |
	rec := false.
	positional @env0:size @env0:>= 1 ifTrue: [rec := positional @env0:at: 1].
	(kwargs ~~ nil and: [kwargs @env0:includesKey: 'record'])
		ifTrue: [rec := kwargs @env0:at: 'record'].
	"``action'' is what decides whether a filter is installed at all: CPython
	treats action=None as ``no filter'', and every other 3.11 keyword only
	refines the filter that ``action'' asks for."
	action := (kwargs ~~ nil and: [kwargs @env0:includesKey: 'action'])
		ifTrue: [kwargs @env0:at: 'action'] ifFalse: [nil].
	spec := nil.
	(action ~~ nil and: [action @env0:~~ None]) ifTrue: [
		cat := (kwargs ~~ nil and: [kwargs @env0:includesKey: 'category'])
			ifTrue: [kwargs @env0:at: 'category'] ifFalse: [Warning].
		lineno := (kwargs ~~ nil and: [kwargs @env0:includesKey: 'lineno'])
			ifTrue: [kwargs @env0:at: 'lineno'] ifFalse: [0].
		append := (kwargs ~~ nil and: [kwargs @env0:includesKey: 'append'])
			ifTrue: [kwargs @env0:at: 'append'] ifFalse: [false].
		spec := { action. cat. lineno. append }].
	"Built the same way catch_warnings does -- the setters are env-0, so the
	sends name their environment."
	^ (((CatchWarnings @env0:new) @env0:_owner: self) @env0:_record: rec)
		@env0:_filterSpec: spec
%

set compile_env: 0

! ------- WarningMessage: one recorded warning
expectvalue /Class
doit
Object subclass: 'WarningMessage'
  instVarNames: #( message category filename lineno file line source )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
WarningMessage comment:
'One warning captured by ``catch_warnings(record=True)''.

CPython appends these to the list its context manager hands back, and callers
read them by ATTRIBUTE -- w[0].message, w[0].category, w[-1].filename.  Grail
recorded two-element pairs instead, so every one of those reads failed.

The distinction that matters most: ``message'' is a Warning INSTANCE, not the
text.  ``warnings.warn("boom")'' records UserWarning("boom"), so str(w[0].message)
is the text and w[0].message.args[0] is too -- test_warnings uses the latter.
Recording the bare string passes a str() check and fails everything else.'
%

expectvalue /Class
doit
WarningMessage category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
WarningMessage removeAllMethods: 0.
WarningMessage removeAllMethods: 1.
WarningMessage class removeAllMethods: 0.
WarningMessage class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Instance creation'
classmethod: WarningMessage
___message___: aMessage category: aCategory filename: aFilename lineno: aLineno
	"Build a record.  aMessage may be either the warning TEXT or an already
	constructed Warning instance -- CPython accepts both at warn() and stores
	an instance either way, so the coercion happens here rather than at each
	call site."

	| inst msg |
	msg := aMessage.
	(msg @env0:isKindOf: AbstractException)
		ifFalse: [
			"___new___ / ___args___: are env-1 on BaseException; this classmethod
			is env-0 beside the ivar setter, so both sends name their env."
			msg := aCategory @env1:___new___.
			msg @env1:___args___: { aMessage }].
	inst := self @env0:new.
	inst
		___setMessage___: msg
		category: aCategory
		filename: aFilename
		lineno: aLineno.
	^ inst
%

! ___pythonValueAttrs___ MUST be compiled in env 0: object>>___pyAttrLoad___
! consults it through an ENV-0 ``respondsTo:'', which never sees an env-1
! method (the same requirement called out in Bool.gs and Bytes.gs).

category: 'Grail-Python Attribute Hook'
classmethod: WarningMessage
___pythonValueAttrs___
	"The seven unary methods below are Python VALUE attributes, not bound
	methods.  Without this, ``w[0].message'' answers a BoundMethod and the
	next step -- ``.args[0]'', ``.category.__name__'' -- fails on it, which
	is exactly how the first cut of this class read."

	^ IdentitySet new
		add: #message;
		add: #category;
		add: #filename;
		add: #lineno;
		add: #file;
		add: #line;
		add: #source;
		yourself
%

category: 'Grail-Private'
method: WarningMessage
___setMessage___: aMessage category: aCategory filename: aFilename lineno: aLineno
	message := aMessage.
	category := aCategory.
	filename := aFilename == nil ifTrue: [None] ifFalse: [aFilename].
	lineno := aLineno == nil ifTrue: [0] ifFalse: [aLineno].
	file := None.
	line := None.
	source := None.
	^ self
%

set compile_env: 1

category: 'Grail-Attributes'
method: WarningMessage
message
	"The Warning INSTANCE -- str() of it is the text."

	^ message
%

category: 'Grail-Attributes'
method: WarningMessage
category
	"The warning's class."

	^ category
%

category: 'Grail-Attributes'
method: WarningMessage
filename
	^ filename
%

category: 'Grail-Attributes'
method: WarningMessage
lineno
	^ lineno
%

category: 'Grail-Attributes'
method: WarningMessage
file
	"Always None here: Grail writes warnings to the Transcript, so there is no
	per-warning file object to record."

	^ file
%

category: 'Grail-Attributes'
method: WarningMessage
line
	"Always None: the source LINE at the warn() call site.  CPython reads it
	from linecache using filename/lineno, which Grail does not track for a
	warning's origin."

	^ line
%

category: 'Grail-Attributes'
method: WarningMessage
source
	"Always None: the object that emitted a ResourceWarning, which Grail has
	no equivalent for."

	^ source
%

category: 'Grail-Printing'
method: WarningMessage
__repr__
	"CPython's format, which tests do print on failure."

	^ '{message : ' @env0:, message @env1:__repr__ @env0:,
		', category : ' @env0:, category @env0:name @env0:asString @env0:,
		', filename : ' @env0:, filename @env1:__str__ @env0:,
		', lineno : ' @env0:, lineno @env1:__str__ @env0:, '}'
%

category: 'Grail-Printing'
method: WarningMessage
__str__
	^ self __repr__
%

set compile_env: 0

! ------- CatchWarnings: the object returned by catch_warnings()
expectvalue /Class
doit
Object subclass: 'CatchWarnings'
  instVarNames: #( _owner _savedFilters _savedSeen _record _savedShowwarning _hadShowwarning _filterSpec _entered )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
CatchWarnings category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
CatchWarnings removeAllMethods: 0.
CatchWarnings removeAllMethods: 1.
CatchWarnings class removeAllMethods: 0.
CatchWarnings class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Private'
method: CatchWarnings
_owner: aWarnings
	_owner := aWarnings.
	^ self
%

category: 'Grail-Private'
method: CatchWarnings
_record: aBoolean
	_record := aBoolean == true.
	^ self
%

category: 'Grail-Private'
method: CatchWarnings
_filterSpec: anArrayOrNil
	"CPython 3.11's shorthand: catch_warnings(action=..., category=...,
	lineno=..., append=...) installs that filter on entry, inside the
	isolation it was already providing.  nil means no filter was asked for,
	which is NOT the same as an empty one."

	_filterSpec := anArrayOrNil.
	^ self
%

set compile_env: 1

category: 'Grail-Context manager'
method: CatchWarnings
__enter__
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
%

category: 'Grail-Context manager'
method: CatchWarnings
___exit__: positional kw: kwargs
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
%

category: 'Grail-Context manager'
method: CatchWarnings
__exit__: excType _: excValue _: tb
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
%

set compile_env: 0
