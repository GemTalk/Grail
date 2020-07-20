! ------------------- Remove existing behavior from _Imp
expectvalue /Metaclass3       
doit
_Imp removeAllMethods.
_Imp class removeAllMethods.
%
! ------------------- Class methods for _Imp
set compile_env: 0
category: 'other'
classmethod: _Imp
moduleName

	^#'_imp'
%
! ------------------- Instance methods for _Imp
set compile_env: 0
category: 'other'
method: _Imp
_fixModule: module code: code filename: path

	self halt.
%
category: 'other'
method: _Imp
 acquireLock: module

	self halt.
%
category: 'other'
method: _Imp
createBuiltin: module spec: spec

	self halt.
%
category: 'other'
method: _Imp
createDynamic: module spec: spec file: file

	self halt.
%
category: 'other'
method: _Imp
execBuiltin: module mod: mod

	self halt.
%
category: 'other'
method: _Imp
execDynamic: module mod: mod

	self halt.
%
category: 'other'
method: _Imp
extensionSuffixes: module

	self halt.
%
category: 'other'
method: _Imp
getFrozen: module name: name

	self halt.
%
category: 'other'
method: _Imp
initFrozen: module name: name

	self halt.
%
category: 'other'
method: _Imp
initialize
"
	SessionTemps current removeKey: #'Python__Imp' ifAbsent: [].
"
	super initialize.
	dictionary 
		at: #'_fix_co_filename'				put: [:arguments :keywords | self _fixModule: (arguments at: 1) code: (arguments at: 2) filename: (arguments at: 3)];
		at: #'acquire_lock'					put: [:arguments :keywords | self acquireLock: (arguments at: 1)];
		at: #'check_hash_based_pycs'	put: [:arguments :keywords | 'default'];
		at: #'create_builtin'					put: [:arguments :keywords | self createBuiltin: (arguments at: 1) spec: (arguments at: 2)];
		at: #'create_dynamic'				put: [:arguments :keywords | self createDynamic: (arguments at: 1) spec: (arguments at: 2) file: (arguments at: 3)];
		at: #'exec_builtin'					put: [:arguments :keywords | self execBuiltin: (arguments at: 1) mod: (arguments at: 2)];
		at: #'exec_dynamic'					put: [:arguments :keywords | self execDynamic: (arguments at: 1) mod: (arguments at: 2)];
		at: #'extension_suffixes'			put: [:arguments :keywords | self extensionSuffixes: (arguments at: 1)];
		at: #'get_frozen_object'			put: [:arguments :keywords | self getFrozen: (arguments at: 1) name: (arguments at: 2)];
		at: #'init_frozen'						put: [:arguments :keywords | self initFrozen: (arguments at: 1) name: (arguments at: 2)];
		at: #'is_builtin'						put: [:arguments :keywords | self isBuiltin: (arguments at: 1) name: (arguments at: 2)];
		at: #'is_frozen'						put: [:arguments :keywords | self isFrozen: (arguments at: 1) name: (arguments at: 2)];
		at: #'is_frozen_package'			put: [:arguments :keywords | self isFrozenPackage: (arguments at: 1) name: (arguments at: 2)];
		at: #'lock_held'						put: [:arguments :keywords | self lockHeld: (arguments at: 1)];
		at: #'release_lock'					put: [:arguments :keywords | self releaseLock: (arguments at: 1)];
		at: #'source_hash'					put: [:arguments :keywords | self sourceHash: (arguments at: 1) key: (arguments at: 2) source: (arguments at: 3)];
		yourself.
%
category: 'other'
method: _Imp
isBuiltin: module name: name

	self halt.
%
category: 'other'
method: _Imp
isFrozen: module name: name

	self halt.
%
category: 'other'
method: _Imp
isFrozenPackage: module name: name

	self halt.
%
category: 'other'
method: _Imp
 lockHeld: module

	self halt.
%
category: 'other'
method: _Imp
 releaseLock: module

	self halt.
%
category: 'other'
method: _Imp
sourceHash: module key: key source: source

	self halt.
%
