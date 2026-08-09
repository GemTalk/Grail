! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FunctionScopeImportTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FunctionScopeImportTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FunctionScopeImportTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FunctionScopeImportTestCase
!
! An import inside a function, when the module imports the same name.
!
! An import is a BINDING, so it has to agree with how the name is later READ.
! Grail's import codegen chose between "store on the module instance" and
! "store in a Smalltalk temp" by asking only whether the name was a module
! variable -- which is true of a function-local import whenever the module
! ALSO imports that name.  The write went to the module while the read looked
! at the function's local, so the name came back unbound:
!
!     import os.path
!     def f():
!         import os.path      # stored on the module...
!         return os.path.sep  # ...read as a local -> UnboundLocalError
!
! All three forms were affected -- plain, dotted, and from-import.  It only
! showed when the name collided with a module-level import, which is why it
! survived: a function importing something the module does not import worked
! fine, and still does.
!
! Every OTHER binding statement already applied the local-shadow rule
! (AssignAst >> isModuleScopeStoreTarget: and its counterparts on
! AnnAssignAst / AugAssignAst / DeleteAst / ForAst).  The two import
! statements were the ones that never got it, so the rule now lives once on
! StatementAst as ___importBindsAtModuleScope___: and both call it.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FunctionScopeImportTestCase removeAllMethods.
FunctionScopeImportTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: FunctionScopeImportTestCase
setUp
	"Reload tests/python/function_scope_import.py fresh each test."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'function_scope_import' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/function_scope_import.py')
		name: 'function_scope_import'.
	probe := testModule @env1:probe.
%

category: 'Grail-Private'
method: FunctionScopeImportTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! ------------------- The bug: a function-local import shadowing a module one

category: 'Grail-Tests - shadowing'
method: FunctionScopeImportTestCase
testDottedImportShadowingAModuleImport
	"``import os.path'' in a function whose module also imports os.path."

	self assert: (self at: 'dotted_shadow') @env0:asString equals: '/'
%

category: 'Grail-Tests - shadowing'
method: FunctionScopeImportTestCase
testPlainImportShadowingAModuleImport
	"``import json'' -- the undotted form failed the same way, so this is
	not specific to dotted paths."

	self assert: (self at: 'plain_shadow') @env0:asString equals: '[1]'
%

category: 'Grail-Tests - shadowing'
method: FunctionScopeImportTestCase
testFromImportShadowingAModuleImport
	"``from math import floor'' -- the third form, via ImportFromAst."

	self assert: (self at: 'from_shadow') equals: 2
%

category: 'Grail-Tests - shadowing'
method: FunctionScopeImportTestCase
testAliasedImportShadowingAModuleName
	"The ALIAS is the bound name, so ``import os.path as json'' collides
	with the module-level ``json'' even though the imported module differs."

	self assert: (self at: 'aliased_shadow') @env0:asString equals: '/'
%

category: 'Grail-Tests - shadowing'
method: FunctionScopeImportTestCase
testImportInANestedFunction
	"The shadow rule walks every enclosing function, not just the innermost."

	self assert: (self at: 'nested_shadow') @env0:asString equals: '[2]'
%

category: 'Grail-Tests - unaffected'
method: FunctionScopeImportTestCase
testImportInAClassMethod
	"A method body is compiled with classBeingCompiled set, and the OLD
	condition already bailed out on that, so this case worked before the fix
	and passes either way.  Kept as a guard: the new rule checks
	classBeingCompiled after the ``global'' test rather than before it, so
	this is the assertion that the reordering did not disturb methods."

	self assert: (self at: 'method_shadow') @env0:asString equals: '[3]'
%

! ------------------- What the fix must not break

category: 'Grail-Tests - unaffected'
method: FunctionScopeImportTestCase
testImportsThatDoNotShadowStillWork
	"A function importing something the module does NOT import always
	worked; the local-shadow check must leave it alone."

	self assert: (self at: 'no_shadow_dotted') @env0:asString
		equals: 'html.entities'.
	self assert: (self at: 'no_shadow_plain') equals: 1.
	self assert: (self at: 'no_shadow_from') equals: 3
%

category: 'Grail-Tests - unaffected'
method: FunctionScopeImportTestCase
testGlobalDeclarationStillForcesTheModuleBinding
	"``global json'' then ``import json'' must bind the MODULE global, not a
	local -- the one case where a function-scope import still stores on the
	module.  Checked before the shadow rule, exactly as assignment does it."

	self assert: (self at: 'global_declared_import') @env0:asString
		equals: '[4]'
%

category: 'Grail-Tests - unaffected'
method: FunctionScopeImportTestCase
testModuleScopeImportsStillResolveFromFunctions
	"The module-level imports must still be readable from a function that
	does not re-import them -- that is the path the old code got right."

	self assert: (self at: 'module_scope_still_works')
%
