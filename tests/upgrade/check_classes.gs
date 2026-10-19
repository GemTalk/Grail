! file tests/upgrade/check_classes.gs -- run by tests/scripts/run_grail_upgrade_test.sh
!
! The Smalltalk half of the verify phase: walks everything reachable from
! GemDBRoot['upgrade'] (stopping at classes, methods and dictionaries in the
! symbol list) and checks the CLASS of every object found, and every superclass
! of it:
!
!   current.<Class>  a class one of Grail's dictionaries names is the one it
!                    names NOW: an object of the previous install's copy of a
!                    Grail class runs that install's code. (Python classes are
!                    anonymous -- in no dictionary -- and verify_phase.py checks
!                    those against the app module and the stdlib.)
!   version.<Class>  no object is an instance of an old version of its class
!                    (classHistory last ~~ class): the version a migration left
!                    behind
!
! Prints UPGRADE PASS / UPGRADE FAIL lines like verify_phase.py; exits 1 on a FAIL.
output pushnew check_classes.out
iferr 1 where
iferr 2 output pop
iferr 3 exit 1
login
run
| root seen todo classes symList grailDicts failed out visit report |
out := GsFile stdout.
failed := 0.
report := [:ok :name :why |
	ok
		ifTrue: [out nextPutAll: 'UPGRADE PASS ' , name; lf]
		ifFalse: [failed := failed + 1. out nextPutAll: 'UPGRADE FAIL ' , name , ': ' , why; lf]].
symList := System myUserProfile symbolList.
grailDicts := (#(#Python #PythonAst #EmbeddedPython #PythonTests #EmbeddedPythonTests #PythonModules)
	collect: [:n | symList objectNamed: n]) reject: [:d | d isNil].
root := (UserGlobals at: #GemDBRoot) at: 'upgrade'.
seen := IdentitySet new.
todo := OrderedCollection with: root.
classes := IdentitySet new.
visit := [:obj |
	(obj isNil or: [(seen includes: obj) or: [obj isSpecial]]) ifFalse: [
		seen add: obj.
		(obj isBehavior or: [(obj isKindOf: GsNMethod) or: [(obj isKindOf: SymbolDictionary)
			or: [obj isSymbol]]])
				ifFalse: [
					classes add: obj class.
					todo add: obj]]].
seen add: root.
classes add: root class.
[todo notEmpty and: [seen size < 50000]] whileTrue: [ | obj |
	obj := todo removeFirst.
	1 to: obj class instSize do: [:i | visit value: (obj instVarAt: i)].
	(obj class isPointers and: [obj class isIndexable])
		ifTrue: [1 to: obj _basicSize do: [:i | visit value: (obj _primitiveAt: obj class instSize + i)]].
	obj dynamicInstanceVariables do: [:n | visit value: (obj dynamicInstVarAt: n)]].
out nextPutAll: 'check_classes: walked ' , seen size printString , ' objects, '
	, classes size printString , ' classes'; lf.
"Each class, and every superclass of it."
(classes inject: IdentitySet new into: [:all :c |
	| k | k := c.
	[k notNil] whileTrue: [all add: k. k := k superclass].
	all]) do: [:cls | | named |
		named := grailDicts inject: nil into: [:found :dict |
			found ifNil: [ | v | v := dict at: cls name otherwise: nil.
				(v notNil and: [v isBehavior and: [v name = cls name]]) ifTrue: [v] ifFalse: [nil]]].
		(named notNil and: [(symList detect: [:dict | (dict at: cls name otherwise: nil) == cls]
				ifNone: [nil]) isNil]) ifTrue: [
			report value: false value: 'current.' , cls name
				value: 'reachable objects use a ' , cls name , ' (oop ' , cls asOop printString
					, ') that is not the one Grail names (oop ' , named asOop printString , ')'].
		report value: cls classHistory last == cls value: 'version.' , cls name
			value: 'reachable objects use version ' , (cls classHistory indexOfIdentical: cls) printString
				, ' of ' , cls name , ' but the class history has ' , cls classHistory size printString].
out nextPutAll: 'check_classes: ' , failed printString , ' failed'; lf.
failed > 0 ifTrue: [System abortTransaction. ExitClientError signal: 'check_classes failed'].
System abortTransaction.
%
output pop
logout
exit 0
