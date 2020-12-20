! ------------------- Remove existing behavior from _warnings
removeAllMethods _warnings
removeAllClassMethods _warnings
! ------------------- Class methods for _warnings
set compile_env: 0
category: 'other'
classmethod: _warnings
moduleName

	^#'_warnings'
%
! ------------------- Instance methods for _warnings
set compile_env: 0
category: 'other'
method: _warnings
initialize

	super initialize.
	globals 
		at: #'__class__'			put: module;
		at: #'_defaultaction'		put: 'default';
		at: #'__doc__'				put: '_warnings provides basic warning filtering support.' , Character lf printString , 'It is a helper module to speed up interpreter start-up.';
		at: #'__loader__'			put: nil;		"<class '_frozen_importlib.BuiltinImporter'>"
		at: #'__name__'			put: '_warnings';
		at: #'__package__'		put: '';
		at: #'__spec__'			put: nil;		"ModuleSpec(name='_warnings', loader=<class '_frozen_importlib.BuiltinImporter'>, origin='built-in')"
		at: #'_filters_mutated'	put: [:arguments :keywords :scope | self _filtersMutated];
		at: #'_onceregistry'		put: SymbolDictionary new;
		at: #'filters'				put: list new;
			"('default', None, <class 'DeprecationWarning'>, '__main__', 0), 
			('ignore', None, <class 'DeprecationWarning'>, None, 0), 
			('ignore', None, <class 'PendingDeprecationWarning'>, None, 0), 
			('ignore', None, <class 'ImportWarning'>, None, 0), 
			('ignore', None, <class 'ResourceWarning'>, None, 0)"
		at: #'warn'					put: [:arguments :keywords :scope | self warn];
		at: #'warn_explicit'		put: [:arguments :keywords :scope | self warnExplicit];
		yourself.
%
