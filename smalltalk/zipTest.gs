! ------------------- Remove existing behavior from zipTest
expectvalue /Metaclass3
doit
zipTest removeAllMethods.
zipTest class removeAllMethods.
%
! ------------------- Class methods for zipTest
! ------------------- Instance methods for zipTest
set compile_env: 0
category: 'todo'
method: zipTest
test__iter__
   #pyTodo
%
category: 'todo'
method: zipTest
test__next__
   #pyTodo
%
