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
_resolveCategory: category
	"Default to UserWarning when caller passes nil/None."

	(category @env0:== nil @env0:or: [category @env0:== None]) ifTrue: [^ UserWarning].
	^ category
%

category: 'Grail-Private'
method: warnings
_actionFor: message _: category
	"Walk the filter list, returning the first matching action.
	Each filter is a triple { action. categoryClass. messageSubstring }
	where categoryClass=nil matches all and messageSubstring=nil matches
	any text.  When no filter matches, return 'default'."

	| msgStr |
	msgStr := message @env0:asString.
	(self @env1:_filters) @env0:do: [:f |
		| catMatch msgMatch fCat fMsg |
		fCat := f @env0:at: 2.
		fMsg := f @env0:at: 3.
		catMatch := fCat @env0:== nil
			@env0:or: [category @env0:== fCat
				@env0:or: [category @env0:inheritsFrom: fCat]].
		msgMatch := fMsg @env0:== nil
			@env0:or: [(msgStr @env0:indexOfSubCollection: fMsg) @env0:> 0].
		(catMatch @env0:and: [msgMatch]) ifTrue: [^ f @env0:at: 1]
	].
	^ 'default'
%

category: 'Grail-Public'
method: warnings
warn: message
	"warn(message) - emit a UserWarning."

	^ self @env1:warn: message _: nil
%

category: 'Grail-Public'
method: warnings
warn: message _: category
	"warn(message, category) - emit a warning of `category` (defaults
	to UserWarning when nil/None)."

	| cat action key |
	cat := self @env1:_resolveCategory: category.
	action := self @env1:_actionFor: message _: cat.
	action @env0:= 'ignore' ifTrue: [^ None].
	action @env0:= 'error' ifTrue: [^ cat @env1:___signal___: message].
	"Default / once / module: dedupe by (text, category) and emit."
	(action @env0:= 'always') ifFalse: [
		key := message @env0:asString @env0:, '|' @env0:, cat @env0:name @env0:asString.
		((self @env1:_seen) @env0:includesKey: key @env0:asSymbol) ifTrue: [^ None].
		(self @env1:_seen) @env0:at: key @env0:asSymbol put: true
	].
	Transcript @env0:nextPutAll: (self @env1:formatwarning: message _: cat _: '<unknown>' _: 0).
	Transcript @env0:cr.
	^ None
%

category: 'Grail-Public'
method: warnings
warn_explicit: message _: category _: filename _: lineno
	"warn_explicit(message, category, filename, lineno) - lower-level
	form used by the C implementation; here it bypasses the dedupe
	for action 'always' and otherwise behaves like warn()."

	| cat action |
	cat := self @env1:_resolveCategory: category.
	action := self @env1:_actionFor: message _: cat.
	action @env0:= 'ignore' ifTrue: [^ None].
	action @env0:= 'error' ifTrue: [^ cat @env1:___signal___: message].
	Transcript @env0:nextPutAll: (self @env1:formatwarning: message _: cat _: filename _: lineno).
	Transcript @env0:cr.
	^ None
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

	^ self @env1:simplefilter: action _: nil
%

category: 'Grail-Filters'
method: warnings
simplefilter: action _: category
	"simplefilter(action, category) - drop all filters and install
	one that matches `category` (nil means all)."

	(self @env1:_filters) @env0:removeAll: (self @env1:_filters) @env0:copy.
	(self @env1:_filters) @env0:addFirst: { action. category. nil }.
	self @env0:at: #_seen put: IdentityKeyValueDictionary @env0:new.
	^ None
%

category: 'Grail-Filters'
method: warnings
filterwarnings: action
	"filterwarnings(action) - add a filter matching every warning."

	^ self @env1:filterwarnings: action _: nil _: nil
%

category: 'Grail-Filters'
method: warnings
filterwarnings: action _: messageSubstring
	"filterwarnings(action, message_pattern) - add a filter scoped
	to messages containing `messageSubstring`."

	^ self @env1:filterwarnings: action _: messageSubstring _: nil
%

category: 'Grail-Filters'
method: warnings
filterwarnings: action _: messageSubstring _: category
	"filterwarnings(action, message_pattern, category) - add a filter.
	Patterns use plain substring match instead of CPython's regex
	(callers like itsdangerous and Werkzeug only ever pass
	all-or-nothing filters, so the regex compiler isn't worth pulling
	in yet)."

	(self @env1:_filters) @env0:addFirst: { action. category. messageSubstring }.
	^ None
%

category: 'Grail-Filters'
method: warnings
resetwarnings
	"resetwarnings() - clear all installed filters."

	(self @env1:_filters) @env0:removeAll: (self @env1:_filters) @env0:copy.
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

	_savedFilters := (_owner @env1:_filters) @env0:copy.
	_savedSeen := IdentityKeyValueDictionary @env0:new.
	(_owner @env1:_seen) @env0:keysAndValuesDo: [:k :v |
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
	current := _owner @env1:_filters.
	current @env0:removeAll: current @env0:copy.
	_savedFilters @env0:do: [:f | current @env0:addLast: f].
	current := IdentityKeyValueDictionary @env0:new.
	_savedSeen @env0:keysAndValuesDo: [:k :v | current @env0:at: k put: v].
	_owner @env0:at: #_seen put: current.
	^ false
%

set compile_env: 0
