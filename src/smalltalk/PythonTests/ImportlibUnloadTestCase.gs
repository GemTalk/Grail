! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ImportlibUnloadTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ImportlibUnloadTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ImportlibUnloadTestCase category: 'Grail-SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
ImportlibUnloadTestCase removeAllMethods.
ImportlibUnloadTestCase class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! ImportlibUnloadTestCase
!
! Covers ``importlib removeModule:'' — the sanctioned way to unload a module
! so the next import rebuilds it from source.  Unlike a raw
! ``modules removeKey:'', removeModule: also unloads submodules and clears the
! module's session-local (SessionTemps) caches, both of which a long-lived Gem
! must sweep by hand since there is no process death to discard them.  These
! tests pin the regression where a half-unload of ``re'' (leaving stale
! ``re.*'' submodules and a stale SessionDict-backed pattern cache) made a
! later ``re.sub'' raise ``NameError: name 'RegexFlag' is not defined''.
! ===============================================================================

set compile_env: 0

method: ImportlibUnloadTestCase
testRemoveModuleUnloadsSubmodules
	"removeModule: removes the package AND every submodule, so a partially
	loaded ``re'' subtree can never linger and shadow a fresh import."

	self eval: 'import re
re.compile("abc")'.
	self assert: (importlib @env1:lookupModule: 're') notNil.
	self assert: (importlib @env1:lookupModule: 're._parser') notNil.
	importlib removeModule: 're'.
	self assert: (importlib @env1:lookupModule: 're') isNil.
	self assert: (importlib @env1:lookupModule: 're._parser') isNil.
%

set compile_env: 0

method: ImportlibUnloadTestCase
testRemoveModuleClearsSessionCaches
	"re's pattern cache is a SessionDict living in SessionTemps under the key
	``___GrailSessionDict___re._cache''.  Because it is NOT stored on the
	module instance, a raw removeKey: would leave it behind and a re-import
	would re-bind ``_cache'' to the same stale dict.  removeModule: clears it."

	| temps key |
	self eval: 'import re
re.compile("xyz")'.
	temps := SessionTemps current.
	key := #'___GrailSessionDict___re._cache'.
	self assert: (temps at: key ifAbsent: [nil]) notNil.
	importlib removeModule: 're'.
	self assert: (temps at: key ifAbsent: [nil]) isNil.
%

set compile_env: 0

method: ImportlibUnloadTestCase
testReloadReThenCallableSubWorks
	"Regression: import re, fully unload it, then re-import and run a callable
	re.sub.  Before the removeModule: + atomic-rebuild fix, the reload left re
	half-built and the sub raised ``NameError: name 'RegexFlag' is not
	defined''."

	| mod |
	self eval: 'import re'.
	importlib removeModule: 're'.
	importlib @env1:modules @env0:removeKey: #'re_sub_callable' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/re_sub_callable.py')
		name: 're_sub_callable'.
	self assert: (mod @env1:sub_str_callable) equals: 'aXbXc'.
%

set compile_env: 0
