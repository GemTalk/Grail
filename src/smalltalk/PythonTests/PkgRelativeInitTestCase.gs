! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PkgRelativeInitTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PkgRelativeInitTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PkgRelativeInitTestCase category: 'Grail-SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
PkgRelativeInitTestCase removeAllMethods.
PkgRelativeInitTestCase class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! PkgRelativeInitTestCase
!
! ``from . import X`` inside a package's __init__.py must resolve
! against the package itself.  Previously, ImportFromAst stripped
! the last component of the importer's name unconditionally,
! giving an empty string for a top-level package's __init__.py and
! the misleading ``ModuleNotFoundError: No module named ''``.
!
! These tests exercise ImportFromAst's resolvedModuleName directly
! by parsing a small Python source and walking the resulting AST.
! The end-to-end loader path (which would also exercise submodule
! auto-binding on the parent package — a separate gap) isn't
! covered here.
! ===============================================================================

category: 'Grail-helpers'
method: PkgRelativeInitTestCase
moduleAstFor: aSource named: aName path: aPath
	"Parse a Python source into a ModuleAst with the given name
	and path set, returning the AST."

	| ast |
	ast := importlib astForSource: aSource.
	ast name: aName.
	ast path: aPath.
	ast setParent: nil.
	^ ast
%

category: 'Grail-helpers'
method: PkgRelativeInitTestCase
importFromIn: aModuleAst
	"Return the first ImportFromAst statement in aModuleAst's body."

	^ aModuleAst body body
		detect: [:stmt | stmt isKindOf: ImportFromAst]
%

category: 'Grail-Tests - Relative import inside __init__'
method: PkgRelativeInitTestCase
testFromDotImportInsideInitResolvesToPackageItself
	"`from . import _leaf` inside `pkg/__init__.py` resolves to
	the package itself — `pkg._leaf`.  Before the fix this returned
	an empty string."

	| ast importStmt |
	ast := self
		moduleAstFor: 'from . import _leaf'
		named: 'pkg'
		path: '/somewhere/pkg/__init__.py'.
	importStmt := self importFromIn: ast.
	self assert: importStmt resolvedModuleName equals: 'pkg'.
%

category: 'Grail-Tests - Relative import inside __init__'
method: PkgRelativeInitTestCase
testFromDotSubmoduleInsideInitResolves
	"`from ._sub import X` inside `pkg/__init__.py` resolves to
	`pkg._sub`."

	| ast importStmt |
	ast := self
		moduleAstFor: 'from ._sub import X'
		named: 'pkg'
		path: '/somewhere/pkg/__init__.py'.
	importStmt := self importFromIn: ast.
	self assert: importStmt resolvedModuleName equals: 'pkg._sub'.
%

category: 'Grail-Tests - Relative import inside __init__'
method: PkgRelativeInitTestCase
testFromDotImportFromInsideSubmodule
	"`from . import _other` inside `pkg/_sub.py` (a regular
	submodule, not __init__.py) resolves to `pkg` — the parent
	package, stripping one component."

	| ast importStmt |
	ast := self
		moduleAstFor: 'from . import _other'
		named: 'pkg._sub'
		path: '/somewhere/pkg/_sub.py'.
	importStmt := self importFromIn: ast.
	self assert: importStmt resolvedModuleName equals: 'pkg'.
%

category: 'Grail-Tests - Relative import inside __init__'
method: PkgRelativeInitTestCase
testFromDotSubmoduleInsideSubmodule
	"`from ._other import X` inside `pkg/_sub.py` resolves to
	`pkg._other` — sibling of `_sub`."

	| ast importStmt |
	ast := self
		moduleAstFor: 'from ._other import X'
		named: 'pkg._sub'
		path: '/somewhere/pkg/_sub.py'.
	importStmt := self importFromIn: ast.
	self assert: importStmt resolvedModuleName equals: 'pkg._other'.
%

category: 'Grail-Tests - Relative import inside __init__'
method: PkgRelativeInitTestCase
testModuleAstIsPackageDetectsInitPy
	"ModuleAst >> isPackage checks the path suffix."

	| pkgAst regularAst |
	pkgAst := self
		moduleAstFor: 'x = 1'
		named: 'pkg'
		path: '/somewhere/pkg/__init__.py'.
	regularAst := self
		moduleAstFor: 'x = 1'
		named: 'mymod'
		path: '/somewhere/mymod.py'.
	self assert: pkgAst isPackage equals: true.
	self assert: regularAst isPackage equals: false.
%
