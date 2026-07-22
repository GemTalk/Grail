! ===============================================================================
! SymbolDictionary Methods (Python subscript coercion for symbol-keyed dicts)
! ===============================================================================
! SymbolDictionary is one of GsPackagePolicy's restrictedClasses (it backs the
! VM's symbol resolution), so env-1 session methods are not permitted on it.
! Its keys are Symbols, so Python subscripting of a SymbolDictionary (e.g. a
! module namespace) must coerce the string key to a Symbol and then defer to the
! inherited dict (KeyValueDictionary) behaviour.
!
! These two methods are filed in as SystemUser (persistent, shared) via the
! restricted-class section of install.gs -- they are stable and identical for
! every user.  (They previously lived in dict.gs.)  If/when the core team
! relaxes the restrictedClasses guard for env != 0, these could instead be
! per-user session methods and this file could be filed like the other
! kernel-extension files.
! ===============================================================================

! ------------------- Remove existing Python methods from SymbolDictionary
expectvalue /Metaclass3
doit
SymbolDictionary removeAllMethods: 1.
SymbolDictionary class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Subscript Protocol'
method: SymbolDictionary
__getitem__: key
	"Return the value for key. Raises KeyError if key is not in the dictionary"

	^ super __getitem__: (key @env0:asSymbol)
%

category: 'Grail-Subscript Protocol'
method: SymbolDictionary
__setitem__: key _: value
	"Set d[key] to value"

	super __setitem__: (key @env0:asSymbol) _: value.
	"Resolve None from the calling session's symbol list -- this shared method
	 (SymbolDictionary is a restrictedClass) must not bind to the install user's None."
	^ System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'None'
%

set compile_env: 0
