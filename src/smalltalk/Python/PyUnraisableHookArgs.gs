! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- PyUnraisableHookArgs (the sys.UnraisableHookArgs sys.unraisablehook receives)
expectvalue /Class
doit
object subclass: 'PyUnraisableHookArgs'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyUnraisableHookArgs comment:
'The single argument ``sys.unraisablehook'' is called with -- CPython''s
sys.UnraisableHookArgs.

An UNRAISABLE exception is one raised where there is nowhere to raise it TO:
the interpreter is already unwinding for another reason, or is running cleanup
that has no caller to receive an error.  CPython does not discard those --
PyErr_WriteUnraisable hands them to sys.unraisablehook, whose default prints
``Exception ignored in: ...'' to stderr.  A test that wants to observe one
installs its own hook, which is what test.support.catch_unraisable_exception
does.

Grail reaches this from exactly one place today: closing a delegating generator
whose sub-iterator raises something other than AttributeError while its ``close''
attribute is being looked up (PythonGenerator >> ___closeDelegate___:, CPython''s
gen_close_iter).  The exception cannot propagate -- the generator is already
being torn down by a GeneratorExit that must carry on out -- and dropping it
silently is how test_yield_from''s test_broken_getattr_handling used to see
nothing at all.

Fields are dynamic instVars named exactly as the Python attributes and
registered in ___pythonValueAttrs___, so ``args.exc_type'' reads the VALUE
rather than a BoundMethod wrapping an accessor -- the same arrangement
PyStatResult uses for its st_* fields.

NOT A TUPLE.  CPython''s UnraisableHookArgs is a structseq, so it can also be
indexed and unpacked; this one answers its five fields by NAME only, as
sys.flags / sys.float_info do here.  Every hook in the corpus reads the names.
'
%

expectvalue /Class
doit
PyUnraisableHookArgs category: 'Grail-Modules'
%

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
PyUnraisableHookArgs removeAllMethods.
PyUnraisableHookArgs class removeAllMethods.
PyUnraisableHookArgs removeAllMethods: 1.
PyUnraisableHookArgs class removeAllMethods: 1.
%

set compile_env: 0

category: 'Instance Creation'
classmethod: PyUnraisableHookArgs
excType: excType excValue: excValue excTraceback: excTb errMsg: errMsg object: obj
	"Build the args object.  Every field is stored, including the ones that are
	None, because a hook reads them by name and an ABSENT dynamic instVar would
	raise AttributeError where CPython answers None."

	| inst |
	inst := self new.
	inst dynamicInstVarAt: #'exc_type' put: excType.
	inst dynamicInstVarAt: #'exc_value' put: excValue.
	inst dynamicInstVarAt: #'exc_traceback' put: excTb.
	inst dynamicInstVarAt: #'err_msg' put: errMsg.
	inst dynamicInstVarAt: #'object' put: obj.
	^ inst
%

category: 'Grail-Python Attribute Hook'
classmethod: PyUnraisableHookArgs
___pythonValueAttrs___
	"All five fields are VALUES: ``cm.unraisable.exc_type'' must answer the
	exception CLASS, not a BoundMethod wrapping a selector of that name."

	^ IdentitySet new
		add: #'exc_type'; add: #'exc_value'; add: #'exc_traceback';
		add: #'err_msg'; add: #'object';
		yourself
%

set compile_env: 1

category: 'Grail-String Representation'
method: PyUnraisableHookArgs
__repr__
	"CPython renders UnraisableHookArgs(exc_type=..., exc_value=..., ...)."

	| b |
	b := (Python @env0:at: #builtins) instance.
	^ 'UnraisableHookArgs(exc_type=' @env0:,
		((b repr: (self @env0:dynamicInstVarAt: #'exc_type')) @env0:asString) @env0:,
		', exc_value=' @env0:,
		((b repr: (self @env0:dynamicInstVarAt: #'exc_value')) @env0:asString) @env0:,
		', exc_traceback=' @env0:,
		((b repr: (self @env0:dynamicInstVarAt: #'exc_traceback')) @env0:asString) @env0:,
		', err_msg=' @env0:,
		((b repr: (self @env0:dynamicInstVarAt: #'err_msg')) @env0:asString) @env0:,
		', object=' @env0:,
		((b repr: (self @env0:dynamicInstVarAt: #'object')) @env0:asString) @env0:,
		')'
%

set compile_env: 0
