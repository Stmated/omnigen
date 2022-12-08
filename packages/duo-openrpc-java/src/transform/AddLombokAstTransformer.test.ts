import {FieldAccessorMode, JavaOptions} from '@omnigen/target-java';
import {DEFAULT_TEST_JAVA_OPTIONS, JavaTestUtils} from '@omnigen/duo-openrpc-java-test';
import {DEFAULT_MODEL_TRANSFORM_OPTIONS, ModelTransformOptions} from '@omnigen/core';
import {DEFAULT_OPENRPC_OPTIONS} from '@omnigen/parser-openrpc';

test('lombok', async () => {

  const transformOptions: ModelTransformOptions = {
    ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
    generifyTypes: false,
    elevateProperties: false,
    generificationWrapAllowed: true,
  };

  const targetOptions: JavaOptions = {
    ...DEFAULT_TEST_JAVA_OPTIONS,
    compressSoloReferencedTypes: false,
    compressUnreferencedSubTypes: false,
    fieldAccessorMode: FieldAccessorMode.LOMBOK,
  };

  const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json', DEFAULT_OPENRPC_OPTIONS, transformOptions, targetOptions);

  const inClass = JavaTestUtils.getParsedContent(fileContents, 'In.java');
  expect(inClass.foundImports).toEqual([
    'com.fasterxml.jackson.annotation.JsonProperty',
    'javax.annotation.Generated',
    'lombok.AllArgsConstructor',
    'lombok.Default',
    'lombok.EqualsAndHashCode',
    'lombok.experimental.NonFinal',
    'lombok.experimental.SuperBuilder',
    'lombok.extern.jackson.Jacksonized',
    'lombok.NoArgsConstructor',
    'lombok.RequiredArgsConstructor',
    'lombok.Value',
    'lombok.With',
  ]);
  expect(inClass.foundAnnotations).toEqual([
    'Generated',
    'AllArgsConstructor',
    'EqualsAndHashCode',
    'NonFinal',
    'SuperBuilder',
    'Jacksonized',
    'NoArgsConstructor',
    'RequiredArgsConstructor',
    'Value',
    'With',
    'JsonProperty',
    'Default',
  ]);

  expect(inClass.foundFields).toEqual(['inType']);
  expect(inClass.foundTypes).toEqual(['String']);
});
