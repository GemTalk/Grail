! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- ImportError
expectvalue /Class
doit
Exception subclass: 'ImportError'
  instVarNames: #( name path msg )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ImportError comment:
'Python ImportError exception.

Instance variables:
  name - name of the module that failed to import
  path - path to the module file
  msg - error message
'
%

expectvalue /Class
doit
ImportError category: 'Grail-Exceptions'
%

! ------------------- CPython's ``from X import Y'' miss
set compile_env: 0

category: 'Grail-Import Errors'
classmethod: ImportError
___signalCannotImportName___: aName from: aModuleName path: aPath
	"Raise CPython's ``from PKG import name'' error: the name is neither an
	attribute of the package nor a submodule of it.

	CPython's wording and attributes, both of which matter.  The message is
	``cannot import name 'X' from 'PKG' (/path/to/pkg.py)'' -- with
	``(unknown location)'' when the path is not known -- and the exception carries
	``name'' (the package), ``name_from'' (the missing name) and ``path''.
	traceback.py reads name_from to offer ``Did you mean: ...?'', and stdlib code
	reads name/path.

	Grail raised ModuleNotFoundError here.  That was deliberate -- an ImportError
	SUBCLASS, so ``try: from . import x except ImportError: pass'' hooks still
	worked -- but it reported a missing MODULE for what is really a missing NAME,
	and its message named ``PKG.x'' as the module.  ImportError itself keeps those
	hooks working (it is the base class) while saying what actually happened."

	| instance msg |
	msg := 'cannot import name ''' @env0:, aName @env0:asString @env0:,
		''' from ''' @env0:, aModuleName @env0:asString @env0:, ''' (' @env0:,
		(aPath isNil ifTrue: ['unknown location'] ifFalse: [aPath @env0:asString])
		@env0:, ')'.
	instance := self @env1:___new___.
	instance @env1:___args___: { msg }.
	instance @env0:dynamicInstVarAt: #'name' put: aModuleName @env0:asString.
	instance @env0:dynamicInstVarAt: #'name_from' put: aName @env0:asString.
	aPath isNil ifFalse: [
		instance @env0:dynamicInstVarAt: #'path' put: aPath @env0:asString].
	^ instance @env1:___signal___: msg
%
