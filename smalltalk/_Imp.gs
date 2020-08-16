! ------------------- Remove existing behavior from _imp
expectvalue /Metaclass3       
doit
_imp removeAllMethods.
_imp class removeAllMethods.
%
! ------------------- Class methods for _imp
set compile_env: 0
category: 'other'
classmethod: _imp
moduleName

	^#'_imp'
%
! ------------------- Instance methods for _imp
set compile_env: 0
category: 'functions'
method: _imp
_fixModule: module code: code filename: path

	self halt.
%
category: 'functions'
method: _imp
 acquireLock: module

	self halt.
%
category: 'functions'
method: _imp
createBuiltin: module spec: spec

	self halt.
%
category: 'functions'
method: _imp
createDynamic: module spec: spec file: file

	self halt.
%
category: 'functions'
method: _imp
execBuiltin: module mod: mod

	self halt.
%
category: 'functions'
method: _imp
execDynamic: module mod: mod

	self halt.
%
category: 'functions'
method: _imp
extensionSuffixes: module

	self halt.
%
category: 'functions'
method: _imp
getFrozen: module name: name

	self halt.
%
category: 'functions'
method: _imp
initFrozen: module name: name

	self halt.
%
category: 'functions'
method: _imp
isBuiltin: aSymbol

	^module subclasses anySatisfy: [:each | each moduleName == aSymbol].
%
category: 'functions'
method: _imp
isFrozen: aString

	^false
%
category: 'functions'
method: _imp
isFrozenPackage: module name: name

	self halt.
%
category: 'functions'
method: _imp
 lockHeld: module

	self halt.
%
category: 'functions'
method: _imp
 releaseLock: module

	self halt.
%
category: 'functions'
method: _imp
sourceHash: module key: key source: source

	self halt.
%
set compile_env: 0
category: 'initialization'
method: _imp
initialize

	super initialize.
	globals 
		at: #'__class__'						put: module;
		at: #'_fix_co_filename'				put: [:arguments :keywords :scope | self _fixModule: (arguments at: 1) code: (arguments at: 2) filename: (arguments at: 3)];
		at: #'acquire_lock'					put: [:arguments :keywords :scope | self acquireLock: (arguments at: 1)];
		at: #'check_hash_based_pycs'	put: [:arguments :keywords :scope | 'default'];
		at: #'create_builtin'					put: [:arguments :keywords :scope | self createBuiltin: (arguments at: 1) spec: (arguments at: 2)];
		at: #'create_dynamic'				put: [:arguments :keywords :scope | self createDynamic: (arguments at: 1) spec: (arguments at: 2) file: (arguments at: 3)];
		at: #'exec_builtin'					put: [:arguments :keywords :scope | self execBuiltin: (arguments at: 1) mod: (arguments at: 2)];
		at: #'exec_dynamic'					put: [:arguments :keywords :scope | self execDynamic: (arguments at: 1) mod: (arguments at: 2)];
		at: #'extension_suffixes'			put: [:arguments :keywords :scope | self extensionSuffixes: (arguments at: 1)];
		at: #'get_frozen_object'			put: [:arguments :keywords :scope | self getFrozen: (arguments at: 1) name: (arguments at: 2)];
		at: #'init_frozen'						put: [:arguments :keywords :scope | self initFrozen: (arguments at: 1) name: (arguments at: 2)];
		at: #'is_builtin'						put: [:arguments :keywords :scope | self isBuiltin: (arguments at: 1) asSymbol];
		at: #'is_frozen'						put: [:arguments :keywords :scope | self isFrozen: (arguments at: 1)];
		at: #'is_frozen_package'			put: [:arguments :keywords :scope | self isFrozenPackage: (arguments at: 1) name: (arguments at: 2)];
		at: #'lock_held'						put: [:arguments :keywords :scope | self lockHeld: (arguments at: 1)];
		at: #'release_lock'					put: [:arguments :keywords :scope | self releaseLock: (arguments at: 1)];
		at: #'source_hash'					put: [:arguments :keywords :scope | self sourceHash: (arguments at: 1) key: (arguments at: 2) source: (arguments at: 3)];
		yourself.
%
