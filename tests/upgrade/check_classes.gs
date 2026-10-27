! file tests/upgrade/check_classes.gs -- run by tests/scripts/run_grail_upgrade_test.sh
!
! The Smalltalk half of the verify phase: walks everything reachable from
! GemDBRoot['upgrade'], and from the namespaced app's committed globals
! (stopping at classes, methods and dictionaries in the symbol list), and
! checks the CLASS of every object found, and every superclass of it:
!
!   current.<Class>  a class one of Grail's dictionaries names is the one it
!                    names NOW: an object of the previous install's copy of a
!                    Grail class runs that install's code. (Python classes are
!                    anonymous -- in no dictionary -- and verify_phase.py checks
!                    those against the app module and the stdlib.)
!   ns.present[.<global>]  the namespaced app's committed globals are there
!   ns.placement.<module>  its modules are deployed in its namespace and not
!                    in the default one's PythonModules
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
| root seen todo classes symList grailDicts failed out visit report appNs appMain |
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
"The namespaced app's too (tests/upgrade/upgrade_ns_main.py): what it committed
through gemdb.root, which in its namespace is its top file's globals -- the
committed __main__ -- and where its own module was deployed: in the namespace,
not in the default one's PythonModules."
appNs := (UserGlobals at: #'GrailApps' otherwise: nil)
	ifNotNil: [:apps | apps at: 'grail_upgrade_ns' otherwise: nil].
appMain := appNs isNil ifTrue: [nil] ifFalse: [
	(appNs at: #'GrailCanonicalModules' otherwise: nil)
		ifNotNil: [:reg | reg at: '__main__' otherwise: nil]].
report value: appMain notNil value: 'ns.present'
	value: 'the namespace grail_upgrade_ns, or its committed __main__, is missing'.
appMain ifNotNil: [
	#(#'stored' #'note') do: [:g | | v |
		v := appMain dynamicInstVarAt: g.
		report value: v notNil value: 'ns.present.' , g value: 'its global ' , g , ' is missing'.
		v ifNotNil: [todo add: v]].
	#('upgrade_ns_app' 'upgrade_ns_phases') do: [:m | | cls |
		cls := (appNs at: #'GrailModuleClasses' otherwise: nil)
			ifNotNil: [:d | d at: m asSymbol otherwise: nil].
		report value: (cls notNil and: [(PythonModules at: m asSymbol otherwise: nil) isNil])
			value: 'ns.placement.' , m
			value: m , ' is not deployed in the namespace alone']].
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
"The env-0 session method the synthetic m removes from Object
(tests/upgrade/make_variant.py, session_removal) -- it has no Python name, so
verify_phase.py cannot ask for it."
((System gemEnvironmentVariable: 'GRAIL_UPGRADE_PROBE') = 'm'
	and: [ | c | c := System gemEnvironmentVariable: 'GRAIL_UPGRADE_CHANGES'.
		c isNil or: [c isEmpty or: [c = 'all' or: [(c subStrings: ',') includes: 'session_removal']]]])
	ifTrue: [
		report value: (Object new respondsTo: #'_grailUpgradeRemovedSession0') not
			value: 'probe.removed_session_method_env0'
			value: 'the env-0 session method m removed from Object still answers'].
"No Grail class named Package after the install (#1799): Rowan's Tonel reader
resolves package.st's Package marker through the symbol list, so one would break the
next Rowan load into this image -- Grail's own, or any other project's."
report value: (grailDicts allSatisfy: [:dict | (dict at: #Package otherwise: nil) isNil])
	value: 'no_package_class'
	value: 'a Grail dictionary still binds Package: '
		, ((grailDicts select: [:dict | (dict at: #Package otherwise: nil) notNil]) collect: [:d | d name]) asArray printString.
out nextPutAll: 'check_classes: ' , failed printString , ' failed'; lf.
failed > 0 ifTrue: [System abortTransaction. ExitClientError signal: 'check_classes failed'].
System abortTransaction.
%
output pop
logout
exit 0
