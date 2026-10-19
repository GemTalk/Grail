"The single argument ``sys.unraisablehook' is called with -- CPython's
sys.UnraisableHookArgs.

An UNRAISABLE exception is one raised where there is nowhere to raise it TO:
the interpreter is already unwinding for another reason, or is running cleanup
that has no caller to receive an error.  CPython does not discard those --
PyErr_WriteUnraisable hands them to sys.unraisablehook, whose default prints
``Exception ignored in: ...' to stderr.  A test that wants to observe one
installs its own hook, which is what test.support.catch_unraisable_exception
does.

Grail reaches this from exactly one place today: closing a delegating generator
whose sub-iterator raises something other than AttributeError while its ``close'
attribute is being looked up (PythonGenerator >> ___closeDelegate___:, CPython's
gen_close_iter).  The exception cannot propagate -- the generator is already
being torn down by a GeneratorExit that must carry on out -- and dropping it
silently is how test_yield_from's test_broken_getattr_handling used to see
nothing at all.

Fields are dynamic instVars named exactly as the Python attributes and
registered in ___pythonValueAttrs___, so ``args.exc_type' reads the VALUE
rather than a BoundMethod wrapping an accessor -- the same arrangement
PyStatResult uses for its st_* fields.

NOT A TUPLE.  CPython's UnraisableHookArgs is a structseq, so it can also be
indexed and unpacked; this one answers its five fields by NAME only, as
sys.flags / sys.float_info do here.  Every hook in the corpus reads the names.

"
Class {
	#name : 'PyUnraisableHookArgs',
	#superclass : 'object',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Python Attribute Hook' }
PyUnraisableHookArgs class >> ___pythonValueAttrs___ [
	"All five fields are VALUES: ``cm.unraisable.exc_type'' must answer the
	exception CLASS, not a BoundMethod wrapping a selector of that name."

	^ IdentitySet new
		add: #'exc_type'; add: #'exc_value'; add: #'exc_traceback';
		add: #'err_msg'; add: #'object';
		yourself

]

{ #category : 'Instance Creation' }
PyUnraisableHookArgs class >> excType: excType excValue: excValue excTraceback: excTb errMsg: errMsg object: obj [
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

]
