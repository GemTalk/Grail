! file tests/upgrade/snapshot.gs -- run by tests/scripts/run_grail_upgrade_test.sh
!
! One line per class in Grail's symbol dictionaries: dictionary, name, oop.
! Taken after each install; for an upgrade from n to n (the no-op control) the
! two must be identical -- an upgrade that changes nothing keeps every class,
! where a reinstall would make new ones.
output pushnew snapshot.out
iferr 1 where
iferr 2 output pop
iferr 3 exit 1
login
run
| out lines |
out := GsFile stdout.
lines := SortedCollection new.
#(#Python #PythonAst #EmbeddedPython #PythonTests #EmbeddedPythonTests #PythonModules) do: [:dictName |
	| dict |
	dict := System myUserProfile symbolList objectNamed: dictName.
	dict isNil
		ifTrue: [lines add: 'SNAPSHOT ' , dictName , ' <absent>']
		ifFalse: [
			lines add: 'SNAPSHOT ' , dictName , ' <dictionary> ' , dict asOop printString.
			dict keysAndValuesDo: [:k :v |
				(v isBehavior and: [v name = k])
					ifTrue: [lines add: 'SNAPSHOT ' , dictName , ' ' , k , ' ' , v asOop printString]]]].
lines do: [:l | out nextPutAll: l; lf].
%
output pop
logout
exit 0
