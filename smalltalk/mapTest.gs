! ------------------- Remove existing behavior from mapTest
expectvalue /Metaclass3
doit
mapTest removeAllMethods.
mapTest class removeAllMethods.
%
! ------------------- Class methods for mapTest
! ------------------- Instance methods for mapTest
set compile_env: 0
category: 'todo'
method: mapTest
test__iter__
   #pyTodo
%
category: 'todo'
method: mapTest
test__next__
   #pyTodo
%
