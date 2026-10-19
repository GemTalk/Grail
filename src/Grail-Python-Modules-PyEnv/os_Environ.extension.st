Extension { #name : 'os_Environ' }

{ #category : 'Grail-Private' }
os_Environ >> ___knownNames___ [
	"The names this session has touched — the only ones enumeration can
	report.  See the class comment for why this list exists at all."

	| names |
	names := self @env0:dynamicInstVarAt: #'_known'.
	names == nil ifTrue: [
		names := IdentitySet @env0:new.
		self @env0:dynamicInstVarAt: #'_known' put: names.
	].
	^ names

]

{ #category : 'Grail-Private' }
os_Environ >> ___liveNames___ [
	"Known names that are still set right now, as Strings."

	| out |
	out := list ___new___.
	self ___knownNames___ @env0:do: [:sym |
		(os_Environ @env0:___envRawGet___: (sym @env0:asString)) == nil
			ifFalse: [ out append: (sym @env0:asString) ] ].
	^ out

]

{ #category : 'Grail-Private' }
os_Environ >> ___note___: name [
	"Record a name as known, so later iteration can report it."

	name == nil ifTrue: [^ self].
	self ___knownNames___ @env0:add: ((name @env0:asString) @env0:asSymbol).

]

{ #category : 'Grail-Private' }
os_Environ >> ___seedKnownNames___ [
	"Probe the usual suspects once, so ``list(os.environ)'' is useful
	rather than empty on a fresh session.  Only names that are actually
	SET are kept.  A ``System class >> gemEnvironment'' primitive would
	make this whole method unnecessary — see the class comment.

	The ``*_proxy'' names are here because urllib.request.getproxies_environment
	SCANS os.environ for names ending in ``_proxy'' — CPython's algorithm, which
	requests calls on every request.  Without them an inherited ``http_proxy''
	would be perfectly visible to ``environ['http_proxy']'' and invisible to the
	scan, so Grail would silently ignore a proxy the shell had set.  A scheme
	nobody thought to list is still invisible until some code names it; that is
	the same missing primitive, not a separate bug.  REQUEST_METHOD rides along
	because the same function tests for it (the CGI ``Proxy:'' header quirk,
	CVE-2016-1000110) — that test is a ``in environ'' read-through and does not
	actually need the seed, but a reader who finds one name here should find the
	other."

	#( 'PATH' 'HOME' 'USER' 'LOGNAME' 'SHELL' 'PWD' 'OLDPWD' 'TMPDIR' 'TEMP' 'TMP'
	   'LANG' 'LC_ALL' 'LC_CTYPE' 'TERM' 'TZ' 'HOSTNAME' 'EDITOR' 'PAGER'
	   'GEMSTONE' 'GEMSTONE_NAME' 'GEMSTONE_GLOBAL_DIR' 'GEMSTONE_SYS_CONF'
	   'GEMSTONE_EXE_CONF' 'GEMSTONE_LOG' 'GRAIL_DIR' 'GRAIL_NETLDI'
	   'GRAIL_CODEGEN_TRACE_DIR' 'GRAIL_IR_CODEGEN' 'GRAIL_TEST_WORKERS'
	   'PYTHONPATH' 'PYTHONHOME' 'PYTHONHASHSEED' 'PYTHONUTF8' 'VIRTUAL_ENV'
	   'FLASK_DEBUG' 'FLASK_APP' 'FLASK_SKIP_DOTENV' 'DJANGO_SETTINGS_MODULE'
	   'CI' 'GITHUB_ACTIONS' 'SSH_AUTH_SOCK' 'DISPLAY' 'COLUMNS' 'LINES'
	   'http_proxy' 'HTTP_PROXY' 'https_proxy' 'HTTPS_PROXY'
	   'ftp_proxy' 'FTP_PROXY' 'all_proxy' 'ALL_PROXY'
	   'no_proxy' 'NO_PROXY' 'REQUEST_METHOD' )
		@env0:do: [:n |
			(os_Environ @env0:___envRawGet___: n) == nil
				ifFalse: [ self ___note___: n ] ].

]

{ #category : 'Grail-Private' }
os_Environ >> ___updateFrom___: aDict [
	"Write every entry of aDict through putenv."

	aDict @env0:keysAndValuesDo: [:k :v | self __setitem__: k _: v].
	^ None

]

{ #category : 'Grail-Access Methods' }
os_Environ >> __contains__: key [
	| v |
	v := os_Environ @env0:___envRawGet___: (key @env0:asString).
	v == nil ifTrue: [^ false].
	self ___note___: key.
	^ true

]

{ #category : 'Grail-Access Methods' }
os_Environ >> __delitem__: key [
	"del environ[key] — unsetenv.  KeyError when unset, as CPython."

	(os_Environ @env0:___envRawGet___: (key @env0:asString)) == nil
		ifTrue: [ KeyError ___signal___: (key @env0:asString) ].
	os_Environ @env0:___envRawRemove___: (key @env0:asString).
	^ None

]

{ #category : 'Grail-Comparison' }
os_Environ >> __eq__: other [
	"Mapping's __eq__: equal to any mapping with the same items.  It was
	identity, so ``os.environ == dict(os.environ)'' was False.  A non-mapping
	declines, and the operator layer decides."

	(self @env0:== other) ifTrue: [^ true].
	(other isKindOf: AbstractDictionary) ifFalse: [
		^ Python @env0:at: #'NotImplemented' otherwise: nil].
	^ self copy __eq__: other

]

{ #category : 'Grail-Access Methods' }
os_Environ >> __getitem__: key [
	"environ[key] — reads through; KeyError when unset, as CPython."

	| v |
	v := os_Environ @env0:___envRawGet___: (key @env0:asString).
	v == nil ifTrue: [ KeyError ___signal___: (key @env0:asString) ].
	self ___note___: key.
	^ v

]

{ #category : 'Grail-Merge Operators' }
os_Environ >> __ior__: other [
	"``os.environ |= mapping'' — written through putenv, as update is."

	self update: other.
	^ self

]

{ #category : 'Grail-Iteration' }
os_Environ >> __iter__ [
	^ (self ___liveNames___) __iter__

]

{ #category : 'Grail-Iteration' }
os_Environ >> __len__ [
	^ (self ___liveNames___) __len__

]

{ #category : 'Grail-Merge Operators' }
os_Environ >> __or__: other [
	"PEP 584, as CPython's _Environ: ``environ | mapping'' is a new PLAIN
	dict, other winning on conflicts; the process is untouched."

	(other isKindOf: AbstractDictionary) ifFalse: [
		^ Python @env0:at: #'NotImplemented' otherwise: nil].
	^ self copy update: other; @env0:yourself

]

{ #category : 'Grail-Conversion' }
os_Environ >> __repr__ [
	| parts |
	parts := list ___new___.
	(self ___liveNames___) @env0:do: [:n |
		parts append:
			((n __repr__) @env0:, ': ' @env0:, ((os_Environ @env0:___envRawGet___: n) __repr__)) ].
	^ 'environ({' @env0:, ((', ') join: parts) @env0:, '})'

]

{ #category : 'Grail-Merge Operators' }
os_Environ >> __ror__: other [
	"``mapping | environ'' — a new plain dict, environ winning on conflicts.
	dict's own __or__ declines a non-dict, which is what lands here."

	(other isKindOf: AbstractDictionary) ifFalse: [
		^ Python @env0:at: #'NotImplemented' otherwise: nil].
	^ dict ___new___ update: other; update: self copy; @env0:yourself

]

{ #category : 'Grail-Access Methods' }
os_Environ >> __setitem__: key _: value [
	"environ[key] = value — really does putenv, so a child process
	forked afterwards inherits it (CPython semantics)."

	os_Environ @env0:___envRawPut___: (key @env0:asString) value: (value @env0:asString).
	self ___note___: key.
	^ None

]

{ #category : 'Grail-Access Methods' }
os_Environ >> _update: positional kw: kwargs [
	"environ.update(mapping, **kwargs), and update() with no argument.
	MutableMapping's update takes both; without this form a keyword call
	matched no selector."

	| scratch |
	scratch := dict ___new___.
	scratch _update: positional kw: kwargs.
	^ self ___updateFrom___: scratch

]

{ #category : 'Grail-Access Methods' }
os_Environ >> clear [
	"environ.clear() — unsets every name this view can SEE.  Necessarily
	partial for the same reason iteration is (no environment-block read),
	so it clears the known set rather than the true environment; CPython
	clears everything.  Recorded here rather than refused because the
	partial behaviour is still the useful one for a test guard."

	(self ___liveNames___) @env0:do: [:n | self __delitem__: n ].
	^ None

]

{ #category : 'Grail-Access Methods' }
os_Environ >> copy [
	"environ.copy() — a PLAIN dict snapshot, as CPython.  Mutating the copy
	must not touch the process, which is exactly why callers reach for it
	(test.support.os_helper.EnvironmentVarGuard and CPython's own
	test_hash both save the environment this way before changing it)."

	| d |
	d := dict ___new___.
	(self ___liveNames___) @env0:do: [:n |
		d __setitem__: n _: (os_Environ @env0:___envRawGet___: n) ].
	^ d

]

{ #category : 'Grail-Access Methods' }
os_Environ >> get: key [
	^ self get: key _: None

]

{ #category : 'Grail-Access Methods' }
os_Environ >> get: key _: default [
	| v |
	v := os_Environ @env0:___envRawGet___: (key @env0:asString).
	v == nil ifTrue: [^ default].
	self ___note___: key.
	^ v

]

{ #category : 'Grail-Iteration' }
os_Environ >> items [
	| out |
	out := list ___new___.
	(self ___liveNames___) @env0:do: [:n |
		out append: (tuple @env0:with: n with: (os_Environ @env0:___envRawGet___: n)) ].
	^ out

]

{ #category : 'Grail-Iteration' }
os_Environ >> keys [
	^ self ___liveNames___

]

{ #category : 'Grail-Access Methods' }
os_Environ >> pop: key [
	"environ.pop(key) — KeyError when unset, as CPython."

	| v |
	v := os_Environ @env0:___envRawGet___: (key @env0:asString).
	v == nil ifTrue: [ KeyError ___signal___: (key @env0:asString) ].
	self __delitem__: key.
	^ v

]

{ #category : 'Grail-Access Methods' }
os_Environ >> pop: key _: default [
	| v |
	v := os_Environ @env0:___envRawGet___: (key @env0:asString).
	v == nil ifTrue: [^ default].
	self __delitem__: key.
	^ v

]

{ #category : 'Grail-Access Methods' }
os_Environ >> popitem [
	"environ.popitem() — MutableMapping's: the first name iteration reports,
	unset, as a (name, value) pair.  KeyError when there is none."

	| names name value |
	names := self ___liveNames___.
	names @env0:isEmpty ifTrue: [^ KeyError ___signal___: 'popitem(): environ is empty'].
	name := names @env0:first.
	value := self __getitem__: name.
	self __delitem__: name.
	^ tuple @env0:with: name with: value

]

{ #category : 'Grail-Access Methods' }
os_Environ >> setdefault: key [
	^ self setdefault: key _: ''

]

{ #category : 'Grail-Access Methods' }
os_Environ >> setdefault: key _: default [
	| v |
	v := os_Environ @env0:___envRawGet___: (key @env0:asString).
	v == nil ifFalse: [ self ___note___: key. ^ v ].
	self __setitem__: key _: default.
	^ default

]

{ #category : 'Grail-Access Methods' }
os_Environ >> update: other [
	"environ.update(mapping) — each entry written through putenv.

	The argument is read by a scratch dict, so everything dict.update
	accepts works here too: a mapping, or an iterable of pairs.  This used
	to send ``keys'' to it, which a list of pairs does not answer."

	^ self ___updateFrom___: (dict ___new___ update: other; @env0:yourself)

]

{ #category : 'Grail-Iteration' }
os_Environ >> values [
	| out |
	out := list ___new___.
	(self ___liveNames___) @env0:do: [:n |
		out append: (os_Environ @env0:___envRawGet___: n) ].
	^ out

]
