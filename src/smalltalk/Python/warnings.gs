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
	self @env0:at: #_seen put: IdentityKeyValueDictionary @env0:new
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
	"The action used when no filter matches.  CPython lets this be reassigned
	(test_warnings does), so it is stored rather than answered as a constant."

	^ self @env0:at: #defaultaction ifAbsent: ['default']
%

category: 'Grail-Internal API'
method: warnings
onceregistry
	"The registry backing the ``once'' action.  Grail's dedupe uses its own
	_seen table, so nothing here reads this -- but it is part of the module's
	published surface and code does assign to it."

	^ self @env0:at: #onceregistry ifAbsent: [
		| d |
		d := KeyValueDictionary @env0:new.
		self @env0:at: #onceregistry put: d.
		d]
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
	^ self @env0:at: #filters ifAbsent: [
		| oc |
		oc := OrderedCollection @env0:new.
		self @env0:at: #filters put: oc.
		oc
	]
%

category: 'Grail-Private'
method: warnings
_seen
	^ self @env0:at: #_seen ifAbsent: [
		| d |
		d := IdentityKeyValueDictionary @env0:new.
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
	copy := IdentityKeyValueDictionary @env0:new.
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
		seen := IdentityKeyValueDictionary @env0:new.
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
	above walks one f_back; running off the top keeps the outermost frame,
	which is what CPython does rather than raising."
	hops := ((aStacklevel @env0:isNil) ifTrue: [1] ifFalse: [aStacklevel]) @env0:- 1.
	[hops @env0:> 0] @env0:whileTrue: [
		| back |
		back := [frame @env0:dynamicInstVarAt: #'f_back']
			@env0:on: Error do: [:ex | ex @env0:return: nil].
		(back @env0:isNil or: [back @env0:== None])
			ifTrue: [hops := 0]
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
	"Walk the filter list, returning the first matching action.
	Each filter is CPython's five-tuple
	(action, message, category, module, lineno); a nil message or category
	matches anything.  When no filter matches, return ``defaultaction''."

	| msgStr origin needsOrigin |
	msgStr := message @env0:asString.
	"Only pay for the stack capture when a filter actually names a module:
	___warningOrigin___ costs a RAISE, and the overwhelmingly common case
	is a filter list with no module constraint at all."
	needsOrigin := (self _filters) @env0:detect: [:f |
		f @env0:size @env0:>= 4 and: [(f @env0:at: 4) @env0:notNil]] ifNone: [nil].
	origin := needsOrigin @env0:isNil ifTrue: [nil] ifFalse: [self ___warningOrigin___].
	(self _filters) @env0:do: [:f |
		| catMatch msgMatch modMatch fCat fMsg fMod fLine |
		fMsg := f @env0:at: 2.
		fCat := f @env0:at: 3.
		"Grail builds every filter with five elements, but one inserted by
		_py_warnings' _add_filter comes from Python and a caller may have
		built it by hand -- read the tail defensively."
		fMod := f @env0:size @env0:>= 4 ifTrue: [f @env0:at: 4] ifFalse: [nil].
		fLine := f @env0:size @env0:>= 5 ifTrue: [f @env0:at: 5] ifFalse: [0].
		catMatch := fCat == nil
			@env0:or: [category == fCat
				@env0:or: [category @env0:inheritsFrom: fCat]].
		msgMatch := fMsg == nil
			@env0:or: [(msgStr @env0:indexOfSubCollection: fMsg) @env0:> 0].
		"MODULE is now matched for real, against the dotted MODULE NAME the
		warning was raised from (___warningOrigin___).  CPython compiles the
		pattern as a regex and applies #match, which is ANCHORED AT THE
		START -- so a prefix test is faithful for the literal patterns
		every real filter uses, and avoids pulling the regex engine into
		the warning path (the message pattern is a substring test here for
		the same reason).

		An origin of nil means no Python frame could be built, so a
		module-scoped filter still cannot be shown to apply and is skipped
		-- the safe direction: a warning is not escalated to an error it
		was never proven to name.

		LINENO is still unmatchable and still skips."
		modMatch := fMod == nil
			@env0:or: [origin @env0:notNil
				@env0:and: [origin @env0:size @env0:>= fMod @env0:size
					@env0:and: [(origin @env0:copyFrom: 1 to: fMod @env0:size) @env0:= fMod]]].
		(fLine @env0:== nil or: [fLine @env0:= 0]) ifTrue: [
			(catMatch @env0:and: [msgMatch @env0:and: [modMatch]])
				ifTrue: [^ f @env0:at: 1]]
	].
	"No filter matched: the module's ``defaultaction'', which CPython lets a
	caller reassign.  It was hardcoded to 'default', so setting
	warnings.defaultaction had no effect on anything."
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

	| nargs msg cat lvl |
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
	lvl := nargs @env0:>= 3 ifTrue: [positional @env0:at: 3] ifFalse: [nil].
	(lvl == nil and: [keywords ~~ nil]) ifTrue: [
		(keywords @env0:includesKey: 'stacklevel') ifTrue: [
			lvl := keywords @env0:at: 'stacklevel']].
	^ self ___warn___: msg category: cat
		stacklevel: ((lvl @env0:isNil or: [lvl @env0:== None])
			ifTrue: [1] ifFalse: [lvl])
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

	"Past the announced removal is a bug in the CALLER's version bookkeeping."
	"``sys'' names the module CLASS in Smalltalk; the attributes live on its
	singleton instance, which ___instance___ answers."
	vi := (Python @env0:at: #sys) @env0:___instance___ @env1:version_info.
	(((vi @env1:__getitem__: 0) @env0:> (remove @env1:__getitem__: 0))
		or: [((vi @env1:__getitem__: 0) @env0:= (remove @env1:__getitem__: 0))
			and: [(vi @env1:__getitem__: 1) @env0:> (remove @env1:__getitem__: 1)]])
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
	"The core of warn().  ``stacklevel'' selects WHICH frame is reported as
	the warning's origin: 1 is the warn() call site, 2 its caller, and so on.
	It used to be accepted and dropped, on the grounds that Grail tracked no
	source location at all -- now that it does, the argument is the whole
	point.  gettext computes one deliberately, so a plural-form deprecation is
	blamed on the code that asked for the plural rather than on gettext.py."

	| cat action key recList |
	cat := self _resolveCategory: category.
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
	"``all'' is 3.14's alias for ``always'' -- both mean show every occurrence,
	so neither takes the dedupe below.  Unrecognised, 'all' fell through to
	the deduping branch and every repeat after the first vanished."
	(action @env0:= 'always' or: [action @env0:= 'all']) ifFalse: [
		key := message @env0:asString @env0:, '|' @env0:, cat @env0:name @env0:asString.
		((self _seen) @env0:includesKey: key @env0:asSymbol) ifTrue: [^ None].
		(self _seen) @env0:at: key @env0:asSymbol put: true
	].
	"Past the filters, so this warning IS going to be shown.  When a recorder
	is active it IS the display -- capture instead of printing, so code after
	the warn() in the with-block still runs (test_re's
	test_possible_set_operations binds a name there)."
	recList := self _recordList.
	recList == nil ifFalse: [
		"The warn() CALL SITE.  Only computed here, on the recording path:
		___warningLocation___ raises to get the live frame, and the ordinary
		warn-and-print route must not pay that on every call."
		| loc |
		loc := self ___warningLocation___: stacklevel.
		recList @env0:add: (WarningMessage
			@env0:___message___: message category: cat
			filename: (loc @env0:isNil ifTrue: [nil] ifFalse: [loc @env0:at: 1])
			lineno: (loc @env0:isNil ifTrue: [nil] ifFalse: [loc @env0:at: 2])).
		^ None].
	Transcript @env0:nextPutAll: (self formatwarning: message _: cat _: '<unknown>' _: 0).
	Transcript @env0:cr.
	^ None
%

category: 'Grail-Public'
method: warnings
warn_explicit: message _: category _: filename _: lineno
	"warn_explicit(message, category, filename, lineno) - lower-level
	form used by the C implementation; here it bypasses the dedupe
	for action 'always' and otherwise behaves like warn()."

	| cat action recList |
	cat := self _resolveCategory: category.
	recList := self _recordList.
	recList == nil ifFalse: [
		recList @env0:add: (WarningMessage
			@env0:___message___: message category: cat
			filename: filename lineno: lineno).
		^ None].
	action := self _actionFor: message _: cat.
	action @env0:= 'ignore' ifTrue: [^ None].
	action @env0:= 'error' ifTrue: [^ cat ___signal___: message].
	"Display through showwarning, which is the hook callers replace to
	redirect output -- deciding to warn and writing the warning are separate
	steps in CPython and now here too."
	^ self showwarning: message _: cat _: filename _: lineno
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

category: 'Grail-Public'
method: warnings
showwarning: message _: category _: filename _: lineno
	"showwarning(message, category, filename, lineno) - the hook that WRITES
	a warning, kept separate from the decision to write it.  Replacing it is
	the documented way to redirect warning output."

	Transcript @env0:nextPutAll:
		(self formatwarning: message _: category _: filename _: lineno).
	Transcript @env0:cr.
	^ None
%

category: 'Grail-Public'
method: warnings
_showwarning: positional kw: kwargs
	"Varargs showwarning: CPython's signature carries optional ``file'' and
	``line'' after the four required arguments.  Grail writes to the
	Transcript and has no per-call file to honour, so both are accepted and
	ignored rather than being missing arguments."

	positional @env0:size @env0:< 4 ifTrue: [
		TypeError ___signal___:
			'showwarning() missing required arguments'].
	^ self
		showwarning: (positional @env0:at: 1)
		_: (positional @env0:at: 2)
		_: (positional @env0:at: 3)
		_: (positional @env0:at: 4)
%

category: 'Grail-Public'
method: warnings
_warn_explicit: positional kw: kwargs
	"Varargs warn_explicit.  CPython's full signature is

		warn_explicit(message, category, filename, lineno,
		              module=None, registry=None, module_globals=None,
		              source=None)

	and only the first four carry information Grail acts on: the rest describe
	a per-module __warningregistry__ and a source object, neither of which
	Grail's module-global dedupe consults.  They are accepted and ignored --
	before this, any call passing one (``module='package.module''' is the
	common shape) failed argument binding outright."

	positional @env0:size @env0:< 4 ifTrue: [
		TypeError ___signal___:
			'warn_explicit() missing required arguments'].
	^ self
		warn_explicit: (positional @env0:at: 1)
		_: (positional @env0:at: 2)
		_: (positional @env0:at: 3)
		_: (positional @env0:at: 4)
%

category: 'Grail-Public'
method: warnings
formatwarning: message _: category _: filename _: lineno
	"formatwarning(message, category, filename, lineno) - CPython
	default format: `<file>:<line>: <Category>: <message>`."

	| stream |
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	stream @env0:nextPutAll: filename @env0:asString.
	stream @env0:nextPut: $:.
	stream @env0:nextPutAll: lineno @env0:printString.
	stream @env0:nextPutAll: ': '.
	stream @env0:nextPutAll: category @env0:name @env0:asString.
	stream @env0:nextPutAll: ': '.
	stream @env0:nextPutAll: message @env0:asString.
	^ stream @env0:contents
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
	"simplefilter(action, category) - drop all filters and install
	one that matches `category` (nil means all)."

	(self _filters) @env0:removeAll: (self _filters) @env0:copy.
	(self _filters) @env0:addFirst: { action. nil. category. nil. 0 }.
	self @env0:at: #_seen put: IdentityKeyValueDictionary @env0:new.
	^ None
%

category: 'Grail-Filters'
method: warnings
_simplefilter: positional kw: kwargs
	"Varargs entry for simplefilter(action, category=...) -- the fixed-
	arity simplefilter:/simplefilter:_: pair is positional-only, so a
	call passing category by keyword (test_tzinfo_utcfromtimestamp's
	``simplefilter('ignore', category=DeprecationWarning)'') falls
	through to here (see PyDateTime>>_now:kw: for why)."

	| n action category |
	n := positional @env0:size.
	n @env0:< 1 ifTrue: [
		TypeError ___signal___: 'simplefilter() missing required argument: ''action'''].
	n @env0:> 2 ifTrue: [
		TypeError ___signal___: ('simplefilter() takes at most 2 arguments (' @env0:,
			n @env0:printString @env0:, ' given)')].
	action := positional @env0:at: 1.
	category := n @env0:= 2 ifTrue: [positional @env0:at: 2] ifFalse: [nil].
	kwargs ifNotNil: [
		kwargs @env0:keysAndValuesDo: [:k :v | | key |
			key := k @env0:asString.
			key @env0:= 'category' ifTrue: [category := v]
			ifFalse: [TypeError ___signal___:
				('simplefilter() got an unexpected keyword argument ''' @env0:, key @env0:, '''')]]].
	^ self simplefilter: action _: category
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
	n @env0:< 1 ifTrue: [
		TypeError ___signal___:
			'filterwarnings() missing required argument ''action'' (pos 1)'].
	action := positional @env0:at: 1.
	message := n @env0:>= 2 ifTrue: [positional @env0:at: 2] ifFalse: [kwAt value: 'message' value: nil].
	category := n @env0:>= 3 ifTrue: [positional @env0:at: 3] ifFalse: [kwAt value: 'category' value: nil].
	module := n @env0:>= 4 ifTrue: [positional @env0:at: 4] ifFalse: [kwAt value: 'module' value: nil].
	lineno := n @env0:>= 5 ifTrue: [positional @env0:at: 5] ifFalse: [kwAt value: 'lineno' value: 0].
	append := n @env0:>= 6 ifTrue: [positional @env0:at: 6] ifFalse: [kwAt value: 'append' value: false].
	^ self
		___addFilter___: action
		message: (self ___emptyPatternToNil___: message)
		category: ((category @env0:== nil or: [category @env0:== None])
			ifTrue: [nil] ifFalse: [category])
		module: (self ___emptyPatternToNil___: module)
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

	| f |
	"CPYTHON'S TUPLE ORDER: (action, message, category, module, lineno).
	Grail used to put the category second and the message third -- the same
	five fields in a different order, invisible while nothing outside
	warnings.gs read the list, and wrong the moment something did.
	_py_warnings' _add_filter and test_warnings both index these positions
	directly, so the ORDER is the interop contract."
	f := { action. msg. cat. mod. lineno }.
	(append @env0:== true or: [append @env0:== 1])
		ifTrue: [(self _filters) @env0:addLast: f]
		ifFalse: [(self _filters) @env0:addFirst: f].
	^ None
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
	"filterwarnings(action, message_pattern, category) - add a filter.
	Patterns use plain substring match instead of CPython's regex
	(callers like itsdangerous and Werkzeug only ever pass
	all-or-nothing filters, so the regex compiler isn't worth pulling
	in yet)."

	"Five elements in CPython's order, like every other filter -- the
	3-element shape is gone, so no reader has to probe the size."
	(self _filters) @env0:addFirst: { action. messageSubstring. category. nil. 0 }.
	^ None
%

category: 'Grail-Filters'
method: warnings
resetwarnings
	"resetwarnings() - clear all installed filters."

	(self _filters) @env0:removeAll: (self _filters) @env0:copy.
	self @env0:at: #_seen put: IdentityKeyValueDictionary @env0:new.
	^ None
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

	| rec |
	rec := false.
	positional @env0:size @env0:>= 1 ifTrue: [rec := positional @env0:at: 1].
	(kwargs ~~ nil and: [kwargs @env0:includesKey: 'record'])
		ifTrue: [rec := kwargs @env0:at: 'record'].
	"Built the same way catch_warnings does -- both setters are env-0, so the
	sends name their environment."
	^ ((CatchWarnings @env0:new) @env0:_owner: self) @env0:_record: rec
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
  instVarNames: #( _owner _savedFilters _savedSeen _record )
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

set compile_env: 1

category: 'Grail-Context manager'
method: CatchWarnings
__enter__
	"Snapshot the current filter list + dedupe state, and start recording
	when the caller asked for it.

	CPython's contract is specific and callers depend on all of it: with
	record=True this answers a LIST that fills as warnings are emitted, so
	``len(w)'', ``w[0].message'' and ``del w[:]'' all work inside the block;
	otherwise it answers None.  Grail answered the context manager either way,
	which is why ``object of type 'CatchWarnings' has no len()'' was the most
	common single failure in test_warnings."

	_savedFilters := (_owner _filters) @env0:copy.
	_savedSeen := IdentityKeyValueDictionary @env0:new.
	(_owner _seen) @env0:keysAndValuesDo: [:k :v |
		_savedSeen @env0:at: k put: v
	].
	_record == true ifFalse: [^ None].
	"The buffer IS an OrderedCollection, which is Grail's Python list."
	^ _owner _grail_start_recording
%

category: 'Grail-Context manager'
method: CatchWarnings
__exit__: excType _: excValue _: tb
	"Restore filter list + dedupe state.  Returning false lets any
	exception propagate (we don't suppress)."

	| current |
	"Pop this context's buffer first, so an outer recorder resumes receiving."
	_record == true ifTrue: [_owner _grail_stop_recording].
	current := _owner _filters.
	current @env0:removeAll: current @env0:copy.
	_savedFilters @env0:do: [:f | current @env0:addLast: f].
	current := IdentityKeyValueDictionary @env0:new.
	_savedSeen @env0:keysAndValuesDo: [:k :v | current @env0:at: k put: v].
	_owner @env0:at: #_seen put: current.
	^ false
%

set compile_env: 0
