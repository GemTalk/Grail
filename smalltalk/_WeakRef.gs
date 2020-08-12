! ------------------- Remove existing behavior from _weakref
expectvalue /Metaclass3       
doit
_weakref removeAllMethods.
_weakref class removeAllMethods.
%
! ------------------- Class methods for _weakref
set compile_env: 0
category: 'other'
classmethod: _weakref
moduleName

	^#'_weakref'
%
! ------------------- Instance methods for _weakref
set compile_env: 0
category: 'other'
method: _weakref
initialize

	super initialize.
	globals 
		at: #'__class__'						put: module;
		at: #'__doc__'							put: 'Weak-reference support module';
		at: #'__loader__'						put: nil;		"<class '_frozen_importlib.BuiltinImporter'>"
		at: #'__package__'					put: '';
		at: #'__name__'						put: '_weakref';
		at: #'__spec__'						put: nil;		"ModuleSpec(name='_weakref', loader=<class '_frozen_importlib.BuiltinImporter'>, origin='built-in')"
		at: #'_remove_dead_weakref'		put: [:arguments :keywords :scope | self _remove_dead_weakref];
		at: #'getweakrefs'					put: [:arguments :keywords :scope | self getweakrefs];
		at: #'getweakrefcount'				put: [:arguments :keywords :scope | self getweakrefcount];
		at: #'proxy'								put: [:arguments :keywords :scope | self proxy];
		at: #'ref'								put: nil;		"<class 'weakref'>"
		at: #'ReferenceType'				put: nil;		"<class 'weakref'>"
		at: #'ProxyType'						put: nil;		"<class 'weakproxy'>"
		at: #'CallableProxyType'			put: nil;		"<class 'weakcallableproxy'>"
		yourself.
%
