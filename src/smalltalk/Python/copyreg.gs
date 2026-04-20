! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- copyreg class (Python 'copyreg' module)
expectvalue /Class
doit
module subclass: 'copyreg'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
copyreg comment:
'Python copyreg module.

Provides pickle/copy dispatch table registration.

Currently a minimal stub: `pickle(ob_type, pickle_function[,
constructor])` records `ob_type → pickle_function` in `dispatch_table`,
ignoring the `constructor` argument. The `re` module uses this to
register a pickler for compiled regex patterns
(`copyreg.pickle(Pattern, _pickle, _compile)`).

Methods on this class are real env-1 fast-path methods, dispatched
directly via `copyreg.method(args)` Python calls compiled to
`((copyreg) method: args)` Smalltalk sends.

See https://docs.python.org/3/library/copyreg.html
'
%

expectvalue /Class
doit
copyreg category: 'Modules'
%

expectvalue /Metaclass3
doit
copyreg removeAllMethods: 1.
copyreg class removeAllMethods: 1.
%

set compile_env: 1

! ===============================================================================
! Singleton initialization
! ===============================================================================

category: 'Python-Initialization'
method: copyreg
initialize
	"Create the empty dispatch_table dictionary. The `dispatch_table`
	accessor reads this slot. The `pickle:_:` and `pickle:_:_:` methods
	write to it."

	self @env0:at: #dispatch_table put: (KeyValueDictionary @env0:new)
%

! ===============================================================================
! Stored attribute (not a callable)
! ===============================================================================

category: 'Python-Accessors'
method: copyreg
dispatch_table
	"Return the dispatch_table dictionary (stored attribute, populated
	by `initialize`)."

	^ self @env0:at: #dispatch_table
%

! ===============================================================================
! Fast-path methods
! ===============================================================================

category: 'Python-Built-in Functions'
method: copyreg
pickle: obType _: pickleFunc
	"Python copyreg.pickle(ob_type, pickle_function) — fast path.
	2-arg form. Records `obType → pickleFunc` in dispatch_table."

	(self @env0:at: #dispatch_table) @env0:at: obType put: pickleFunc.
	^ nil
%

category: 'Python-Built-in Functions'
method: copyreg
pickle: obType _: pickleFunc _: constructor
	"Python copyreg.pickle(ob_type, pickle_function, constructor_ob)
	— fast path. 3-arg form. The `constructor` argument is currently
	ignored.

	The `re` module calls this form via
	`copyreg.pickle(Pattern, _pickle, _compile)` to register a
	pickler for compiled regex patterns."

	^ self pickle: obType _: pickleFunc
%

set compile_env: 0
