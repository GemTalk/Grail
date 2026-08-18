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
	"The active recording buffer (an OrderedCollection) while an
	assertWarns context is capturing warnings, or nil when not recording.
	See _grail_start_recording / warn:_:."

	^ self @env0:at: #_recordList ifAbsent: [nil]
%

category: 'Grail-Recording'
method: warnings
_grail_start_recording
	"Begin capturing warnings for unittest.assertWarns: while active, warn()
	APPENDS each (message, category) to this buffer and returns without
	raising, printing, or deduping -- so code after the warn() call in the
	assertWarns with-block still runs (CPython records warnings; it does not
	raise them).  Returns None (the caller discards it)."

	self @env0:at: #_recordList put: OrderedCollection @env0:new.
	^ None
%

category: 'Grail-Recording'
method: warnings
_grail_stop_recording
	"Stop capturing and return the recorded warnings as a list of
	[message, category] pairs (empty if none fired).  Resets the buffer to
	nil so subsequent warnings resume normal filter processing."

	| oc |
	oc := self @env0:at: #_recordList ifAbsent: [nil].
	self @env0:at: #_recordList put: nil.
	^ oc == nil ifTrue: [OrderedCollection @env0:new] ifFalse: [oc]
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
	Each filter is a triple { action. categoryClass. messageSubstring }
	where categoryClass=nil matches all and messageSubstring=nil matches
	any text.  When no filter matches, return 'default'."

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
		fCat := f @env0:at: 2.
		fMsg := f @env0:at: 3.
		"Filters built by simplefilter and the fixed-arity forms are still
		3-element, so read the newer slots defensively."
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
	^ 'default'
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
	"warn(message, category, stacklevel) - stacklevel only shapes the
	reported source location, which Grail does not track; ignore it."

	^ self warn: message _: category
%

category: 'Grail-Public'
method: warnings
_warn: positional kw: keywords
	"Varargs dispatcher for warn() - first-class calls and keyword
	args (warnings.warn(msg, DeprecationWarning, stacklevel=2))."

	| nargs msg cat |
	nargs := positional @env0:size.
	nargs @env0:< 1 ifTrue: [
		TypeError ___signal___: 'warn() missing required argument: message'].
	msg := positional @env0:at: 1.
	cat := nargs @env0:>= 2 ifTrue: [positional @env0:at: 2] ifFalse: [nil].
	(cat == nil and: [keywords ~~ nil]) ifTrue: [
		(keywords @env0:includesKey: 'category') ifTrue: [
			cat := keywords @env0:at: 'category']].
	^ self warn: msg _: cat
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
	"Re-point every time: cheap, and a test that swapped _wm out (test_warnings
	does exactly that, to exercise both implementations) would otherwise leave
	it aimed elsewhere for the rest of the session."
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
	m := self ___pyWarningsModule___.
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
	to UserWarning when nil/None)."

	| cat action key recList |
	cat := self _resolveCategory: category.
	"Recording mode (unittest.assertWarns): capture (message, category)
	without raising or printing, so code after warn() in the with-block
	still runs (test_re test_possible_set_operations binds a name there)."
	recList := self _recordList.
	recList == nil ifFalse: [
		recList @env0:add: (OrderedCollection @env0:with: message with: cat).
		^ None].
	action := self _actionFor: message _: cat.
	action @env0:= 'ignore' ifTrue: [^ None].
	action @env0:= 'error' ifTrue: [^ cat ___signal___: message].
	"Default / once / module: dedupe by (text, category) and emit."
	(action @env0:= 'always') ifFalse: [
		key := message @env0:asString @env0:, '|' @env0:, cat @env0:name @env0:asString.
		((self _seen) @env0:includesKey: key @env0:asSymbol) ifTrue: [^ None].
		(self _seen) @env0:at: key @env0:asSymbol put: true
	].
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
		recList @env0:add: (OrderedCollection @env0:with: message with: cat).
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
	(self _filters) @env0:addFirst: { action. category. nil }.
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
	f := { action. cat. msg. mod. lineno }.
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

	(self _filters) @env0:addFirst: { action. category. messageSubstring }.
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
	"catch_warnings(record=True) -- the kwargs form.  record is
	accepted and ignored (the wrapper's __enter__ returns itself, not
	a recording list; enough for the enter/exit protocol to work).
	Without this selector the call fell back to attr-load + call:
	the unary method auto-invoked on the load and the CatchWarnings
	INSTANCE got called -- TypeError 'not callable' (22 test_set
	tests)."

	^ self catch_warnings
%

set compile_env: 0

! ------- CatchWarnings: the object returned by catch_warnings()
expectvalue /Class
doit
Object subclass: 'CatchWarnings'
  instVarNames: #( _owner _savedFilters _savedSeen )
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

set compile_env: 1

category: 'Grail-Context manager'
method: CatchWarnings
__enter__
	"Snapshot the current filter list + dedupe state."

	_savedFilters := (_owner _filters) @env0:copy.
	_savedSeen := IdentityKeyValueDictionary @env0:new.
	(_owner _seen) @env0:keysAndValuesDo: [:k :v |
		_savedSeen @env0:at: k put: v
	].
	^ self
%

category: 'Grail-Context manager'
method: CatchWarnings
__exit__: excType _: excValue _: tb
	"Restore filter list + dedupe state.  Returning false lets any
	exception propagate (we don't suppress)."

	| current |
	current := _owner _filters.
	current @env0:removeAll: current @env0:copy.
	_savedFilters @env0:do: [:f | current @env0:addLast: f].
	current := IdentityKeyValueDictionary @env0:new.
	_savedSeen @env0:keysAndValuesDo: [:k :v | current @env0:at: k put: v].
	_owner @env0:at: #_seen put: current.
	^ false
%

set compile_env: 0
