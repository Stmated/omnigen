import {TestUtils} from '@test';
import {JavaInterpreter} from '@java/interpret/JavaInterpreter';
import {DEFAULT_JAVA_OPTIONS} from '@java';
import {GenericModelUtil} from '../../../../src/parse/GenericModelUtil';

describe('Test the structuring of GenericModel into a Java CST', () => {

  test('Test basic structuring', async () => {

    const interpreter = new JavaInterpreter();
    const model = await TestUtils.readExample('openrpc', 'petstore-expanded.json');
    const interpretation = await interpreter.interpret(model, DEFAULT_JAVA_OPTIONS);

    expect(interpretation).toBeDefined();

    const allTypes = GenericModelUtil.getAllExportableTypes(model, model.types);
    expect(interpretation.children).toHaveLength(allTypes.length);


    // TODO: We should assert stuff here :)

  });
});
