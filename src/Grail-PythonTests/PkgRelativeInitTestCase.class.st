Class {
	#name : 'PkgRelativeInitTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-helpers' }
PkgRelativeInitTestCase >> importFromIn: aModuleAst [
	"Return the first ImportFromAst statement in aModuleAst's body."

	^ aModuleAst body body
		detect: [:stmt | stmt isKindOf: ImportFromAst]

]

{ #category : 'Grail-helpers' }
PkgRelativeInitTestCase >> moduleAstFor: aSource named: aName path: aPath [
	"Parse a Python source into a ModuleAst with the given name
	and path set, returning the AST."

	| ast |
	ast := importlib astForSource: aSource.
	ast name: aName.
	ast path: aPath.
	ast setParent: nil.
	^ ast

]

{ #category : 'Grail-Tests - Relative import inside __init__' }
PkgRelativeInitTestCase >> testFromDotImportFromInsideSubmodule [
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

]

{ #category : 'Grail-Tests - Relative import inside __init__' }
PkgRelativeInitTestCase >> testFromDotImportInsideInitResolvesToPackageItself [
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

]

{ #category : 'Grail-Tests - Relative import inside __init__' }
PkgRelativeInitTestCase >> testFromDotSubmoduleInsideInitResolves [
	"`from ._sub import X` inside `pkg/__init__.py` resolves to
	`pkg._sub`."

	| ast importStmt |
	ast := self
		moduleAstFor: 'from ._sub import X'
		named: 'pkg'
		path: '/somewhere/pkg/__init__.py'.
	importStmt := self importFromIn: ast.
	self assert: importStmt resolvedModuleName equals: 'pkg._sub'.

]

{ #category : 'Grail-Tests - Relative import inside __init__' }
PkgRelativeInitTestCase >> testFromDotSubmoduleInsideSubmodule [
	"`from ._other import X` inside `pkg/_sub.py` resolves to
	`pkg._other` — sibling of `_sub`."

	| ast importStmt |
	ast := self
		moduleAstFor: 'from ._other import X'
		named: 'pkg._sub'
		path: '/somewhere/pkg/_sub.py'.
	importStmt := self importFromIn: ast.
	self assert: importStmt resolvedModuleName equals: 'pkg._other'.

]

{ #category : 'Grail-Tests - Relative import inside __init__' }
PkgRelativeInitTestCase >> testModuleAstIsPackageDetectsInitPy [
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

]
