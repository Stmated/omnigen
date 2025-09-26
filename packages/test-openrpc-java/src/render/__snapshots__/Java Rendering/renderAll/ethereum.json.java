

package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the version of the current client
 * <p>
 * current client version
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Web3ClientVersionRequest extends JsonRpcRequest<Web3ClientVersionRequestParams> {
  public Web3ClientVersionRequest(String id, Web3ClientVersionRequestParams params) {
    super(id, "web3_clientVersion", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequest<TParams extends JsonRpcRequestParams> {
  private final String id;
  private final String method;
  private final TParams params;

  public JsonRpcRequest(String id, String method, TParams params) {
    this.id = id;
    this.method = method;
    this.params = params;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public String getMethod() {
    return this.method;
  }

  public TParams getParams() {
    return this.params;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request params
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Web3ClientVersionRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * <p>
 * current client versionReturns the version of the current client
 * <p>As response: client version</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Web3ClientVersionResponse extends JsonRpcResponse<String> {
  public Web3ClientVersionResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc response package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcResponse<T> {
  private final String id;
  private final T result;

  public JsonRpcResponse(String id, T result) {
    this.id = id;
    this.result = result;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public T getResult() {
    return this.result;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc error inside an error response
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcError {
  private final int code;
  private final Object data;
  private final String message;

  public JsonRpcError(Integer code, String message, Object data) {
    this.code = ((code == null) ? -1 : code);
    this.message = ((message == null) ? "Unknown Error" : message);
    this.data = data;
  }

  public int getCode() {
    return this.code;
  }

  public Object getData() {
    return this.data;
  }

  public String getMessage() {
    return this.message;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ErrorUnknownError extends JsonRpcError {
  public ErrorUnknownError(Integer code, String message, Object data) {
    super(((code == null) ? -1 : code), ((message == null) ? "Unknown Error" : message), data);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc error response package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcErrorResponse {
  private final ErrorUnknownError error;
  private final String id;

  public JsonRpcErrorResponse(ErrorUnknownError error, String id) {
    this.error = error;
    this.id = id;
  }

  public ErrorUnknownError getError() {
    return this.error;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ErrorUnknown extends JsonRpcErrorResponse {
  public ErrorUnknown(ErrorUnknownError error, String id) {
    super(error, id);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Hashes data using the Keccak-256 algorithm
 * <p>
 * Hashes data
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Web3Sha3Request extends JsonRpcRequest<Web3Sha3RequestParams> {
  public Web3Sha3Request(String id, Web3Sha3RequestParams params) {
    super(id, "web3_sha3", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Web3Sha3RequestParams extends JsonRpcRequestParams {
  private final String data;

  public Web3Sha3RequestParams(String data) {
    this.data = data;
  }

  /**
   * <hr />
   * <strong>Example #1</strong> - sha3Example
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link Web3Sha3RequestParams#data}</dt>
   *     <dd>"0x68656c6c6f20776f726c64"</dd>
   *   </dl>
   *   </p>
   * <p>
   *   <p><strong>📤 Response</strong> - sha3ResultExample
   *   <pre>{@code 0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad}</pre>
   *   </p>
   */
  public String getData() {
    return this.data;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * <p>
 * Hashes dataHashes data using the Keccak-256 algorithm
 * <p>As response: Keccak-256 hash of the given data</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Web3Sha3Response extends JsonRpcResponse<String> {
  public Web3Sha3Response(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Determines if this client is listening for new network connections.
 * <p>
 * returns listening status
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class NetListeningRequest extends JsonRpcRequest<NetListeningRequestParams> {
  public NetListeningRequest(String id, NetListeningRequestParams params) {
    super(id, "net_listening", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class NetListeningRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * <p>
 * returns listening statusDetermines if this client is listening for new network connections.
 * <p>As response: <code>true</code> if listening is active or <code>false</code> if listening is not active</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class NetListeningResponse extends JsonRpcResponse<Boolean> {
  public NetListeningResponse(String id, boolean result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the number of peers currently connected to this client.
 * <p>
 * number of peers
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class NetPeerCountRequest extends JsonRpcRequest<NetPeerCountRequestParams> {
  public NetPeerCountRequest(String id, NetPeerCountRequestParams params) {
    super(id, "net_peerCount", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class NetPeerCountRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * <p>
 * number of peersReturns the number of peers currently connected to this client.
 * <p>As response: number of connected peers.</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class NetPeerCountResponse extends JsonRpcResponse<String> {
  public NetPeerCountResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the network ID associated with the current network.
 * <p>
 * Network identifier associated with network
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class NetVersionRequest extends JsonRpcRequest<NetVersionRequestParams> {
  public NetVersionRequest(String id, NetVersionRequestParams params) {
    super(id, "net_version", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class NetVersionRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * <p>
 * Network identifier associated with networkReturns the network ID associated with the current network.
 * <p>As response: Network ID associated with the current network</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class NetVersionResponse extends JsonRpcResponse<String> {
  public NetVersionResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the number of most recent block.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthBlockNumberRequest extends JsonRpcRequest<EthBlockNumberRequestParams> {
  public EthBlockNumberRequest(String id, EthBlockNumberRequestParams params) {
    super(id, "eth_blockNumber", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthBlockNumberRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the number of most recent block.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthBlockNumberResponse extends JsonRpcResponse<BlockNumberOrTag> {
  public EthBlockNumberResponse(String id, BlockNumberOrTag result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.HashMap;
import java.util.Map;

/**
 * BlockNumber: The hex representation of the block's height<hr /><strong>Example #1</strong> - nullResultExample
 *   <p><strong>📥 Request</strong>
 *   <dl>
 *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
 *     <dd>"0x0"</dd>
 *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
 *     <dd>"0x0"</dd>
 *   </dl>
 *   </p>
 * BlockNumberTag: The optional block height description
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class BlockNumberOrTag {
  private static final Map<Object, BlockNumberOrTag> _values = new HashMap<>();
  public static final BlockNumberOrTag EARLIEST = BlockNumberOrTag.get("earliest");
  public static final BlockNumberOrTag LATEST = BlockNumberOrTag.get("latest");
  public static final BlockNumberOrTag PENDING = BlockNumberOrTag.get("pending");
  private final Object _value;

  private BlockNumberOrTag(Object value) {
    this._value = value;
  }

  public Object getValue() {
    return this._value;
  }

  /**
   * The optional block height description
   */
  public BlockNumberTag getAsBlockNumberTag() {
    return BlockNumberTag.valueOf(((String) this._value));
  }

  public boolean isBlockNumberTag() {
    return this == BlockNumberOrTag.EARLIEST || this == BlockNumberOrTag.LATEST || this == BlockNumberOrTag.PENDING;
  }

  public boolean isKnown() {
    return this == BlockNumberOrTag.EARLIEST || this == BlockNumberOrTag.LATEST || this == BlockNumberOrTag.PENDING;
  }

  public static BlockNumberOrTag get(Object value) {
    if (BlockNumberOrTag._values.containsKey(value)) {
      return BlockNumberOrTag._values.get(value);
    } else  {
      final var created = new BlockNumberOrTag(value);
      BlockNumberOrTag._values.put(value, created);
      return created;
    }
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * The optional block height description
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public enum BlockNumberTag {
  EARLIEST("earliest"),
  LATEST("latest"),
  PENDING("pending");

  private final String value;

  BlockNumberTag(String value) {
    this.value = value;
  }

  public String getValue() {
    return this.value;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Executes a new message call (locally) immediately without creating a transaction on the block chain.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthCallRequest extends JsonRpcRequest<EthCallRequestParams> {
  public EthCallRequest(String id, EthCallRequestParams params) {
    super(id, "eth_call", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Transaction {
  private final String blockHash;
  private final String blockNumber;
  private final String from;
  private final String gas;
  private final String gasPrice;
  private final String hash;
  private final String input;
  private final String nonce;
  private final String r;
  private final String s;
  private final String to;
  private final String transactionIndex;
  private final String v;
  private final String value;

  public Transaction(
    String blockHash,
    String blockNumber,
    String from,
    String gas,
    String gasPrice,
    String hash,
    String input,
    String nonce,
    String to,
    String transactionIndex,
    String value,
    String v,
    String r,
    String s
  ) {
    this.blockHash = blockHash;
    this.blockNumber = blockNumber;
    this.from = from;
    this.gas = gas;
    this.gasPrice = gasPrice;
    this.hash = hash;
    this.input = input;
    this.nonce = nonce;
    this.to = to;
    this.transactionIndex = transactionIndex;
    this.value = value;
    this.v = v;
    this.r = r;
    this.s = s;
  }

  /**
   * The block hash or null when its the pending block
   * <p>
   * Hex representation of a Keccak 256 hash
   */
  public String getBlockHash() {
    return this.blockHash;
  }

  /**
   * The block number or null when its the pending block
   * <p>
   * The hex representation of the block's height
   */
  public String getBlockNumber() {
    return this.blockNumber;
  }

  /**
   * The sender of the transaction
   */
  public String getFrom() {
    return this.from;
  }

  /**
   * The gas limit provided by the sender in Wei
   */
  public String getGas() {
    return this.gas;
  }

  /**
   * The gas price willing to be paid by the sender in Wei
   */
  public String getGasPrice() {
    return this.gasPrice;
  }

  /**
   * Keccak 256 Hash of the RLP encoding of a transaction
   */
  public String getHash() {
    return this.hash;
  }

  /**
   * The data field sent with the transaction
   */
  public String getInput() {
    return this.input;
  }

  /**
   * The total number of prior transactions made by the sender
   */
  public String getNonce() {
    return this.nonce;
  }

  /**
   * ECDSA signature r
   */
  public String getR() {
    return this.r;
  }

  /**
   * ECDSA signature s
   */
  public String getS() {
    return this.s;
  }

  /**
   * Destination address of the transaction. Null if it was a contract create.
   */
  public String getTo() {
    return this.to;
  }

  /**
   * The index of the transaction. null when its pending
   * <p>
   * Hex representation of the integer
   */
  public String getTransactionIndex() {
    return this.transactionIndex;
  }

  /**
   * ECDSA recovery id
   */
  public String getV() {
    return this.v;
  }

  /**
   * Value of Ether being transferred in Wei
   */
  public String getValue() {
    return this.value;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthCallRequestParams extends JsonRpcRequestParams {
  private final BlockNumberOrTag blockNumber;
  private final Transaction transaction;

  public EthCallRequestParams(Transaction transaction, BlockNumberOrTag blockNumber) {
    this.transaction = transaction;
    this.blockNumber = blockNumber;
  }

  /**
   * BlockNumber: The hex representation of the block's height<hr /><strong>Example #1</strong> - nullResultExample
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   * BlockNumberTag: The optional block height description
   */
  public BlockNumberOrTag getBlockNumber() {
    return this.blockNumber;
  }

  public Transaction getTransaction() {
    return this.transaction;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Executes a new message call (locally) immediately without creating a transaction on the block chain.
 * <p>As response: The return value of the executed contract</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthCallResponse extends JsonRpcResponse<String> {
  public EthCallResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the currently configured chain id, a value used in replay-protected transaction signing as introduced by [EIP-155](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md).
 * <p>
 * Returns the currently configured chain id
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthChainIdRequest extends JsonRpcRequest<EthChainIdRequestParams> {
  public EthChainIdRequest(String id, EthChainIdRequestParams params) {
    super(id, "eth_chainId", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthChainIdRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * <p>
 * Returns the currently configured chain idReturns the currently configured chain id, a value used in replay-protected transaction signing as introduced by [EIP-155](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md).
 * <p>As response: hex format integer of the current chain id. Defaults are ETC=61, ETH=1, Morden=62.</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthChainIdResponse extends JsonRpcResponse<String> {
  public EthChainIdResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the client coinbase address.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthCoinbaseRequest extends JsonRpcRequest<EthCoinbaseRequestParams> {
  public EthCoinbaseRequest(String id, EthCoinbaseRequestParams params) {
    super(id, "eth_coinbase", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthCoinbaseRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the client coinbase address.
 * <p>As response: The address owned by the client that is used as default for things like the mining reward</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthCoinbaseResponse extends JsonRpcResponse<String> {
  public EthCoinbaseResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generates and returns an estimate of how much gas is necessary to allow the transaction to complete. The transaction will not be added to the blockchain. Note that the estimate may be significantly more than the amount of gas actually used by the transaction, for a variety of reasons including EVM mechanics and node performance.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthEstimateGasRequest extends JsonRpcRequest<EthEstimateGasRequestParams> {
  public EthEstimateGasRequest(String id, EthEstimateGasRequestParams params) {
    super(id, "eth_estimateGas", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthEstimateGasRequestParams extends JsonRpcRequestParams {
  private final Transaction transaction;

  public EthEstimateGasRequestParams(Transaction transaction) {
    this.transaction = transaction;
  }

  public Transaction getTransaction() {
    return this.transaction;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generates and returns an estimate of how much gas is necessary to allow the transaction to complete. The transaction will not be added to the blockchain. Note that the estimate may be significantly more than the amount of gas actually used by the transaction, for a variety of reasons including EVM mechanics and node performance.
 * <p>As response: The amount of gas used</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthEstimateGasResponse extends JsonRpcResponse<String> {
  public EthEstimateGasResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the current price per gas in wei
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGasPriceRequest extends JsonRpcRequest<EthGasPriceRequestParams> {
  public EthGasPriceRequest(String id, EthGasPriceRequestParams params) {
    super(id, "eth_gasPrice", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGasPriceRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the current price per gas in wei
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGasPriceResponse extends JsonRpcResponse<String> {
  public EthGasPriceResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns Ether balance of a given or account or contract
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetBalanceRequest extends JsonRpcRequest<EthGetBalanceRequestParams> {
  public EthGetBalanceRequest(String id, EthGetBalanceRequestParams params) {
    super(id, "eth_getBalance", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetBalanceRequestParams extends JsonRpcRequestParams {
  private final String address;
  private final String blockNumber;

  public EthGetBalanceRequestParams(String address, String blockNumber) {
    this.address = address;
    this.blockNumber = blockNumber;
  }

  public String getAddress() {
    return this.address;
  }

  /**
   * The hex representation of the block's height<hr />
   * <strong>Example #1</strong> - nullResultExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getBlockNumber() {
    return this.blockNumber;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns Ether balance of a given or account or contract
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetBalanceResponse extends JsonRpcResponse<String> {
  public EthGetBalanceResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Gets a block for a given hash
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetBlockByHashRequest extends JsonRpcRequest<EthGetBlockByHashRequestParams> {
  public EthGetBlockByHashRequest(String id, EthGetBlockByHashRequestParams params) {
    super(id, "eth_getBlockByHash", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetBlockByHashRequestParams extends JsonRpcRequestParams {
  private final String blockHash;
  private final boolean includeTransactions;

  public EthGetBlockByHashRequestParams(String blockHash, boolean includeTransactions) {
    this.blockHash = blockHash;
    this.includeTransactions = includeTransactions;
  }

  /**
   * The hex representation of the Keccak 256 of the RLP encoded block<hr />
   * <strong>Example #1</strong> - nullExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#blockHash}</dt>
   *     <dd>"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"</dd>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getBlockHash() {
    return this.blockHash;
  }

  public boolean isIncludeTransactions() {
    return this.includeTransactions;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Gets a block for a given hash
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetBlockByHashResponse extends JsonRpcResponse<Block> {
  public EthGetBlockByHashResponse(String id, Block result) {
    super(id, result);
  }
}


package generated.omnigen;

// Removed type alias for 'Transactions1' because of lack of Java support;


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * The Block is the collection of relevant pieces of information (known as the block header), together with information corresponding to the comprised transactions, and a set of other block headers that are known to have a parent equal to the present block’s parent’s parent.<hr />
 * <strong>Example #1</strong> - nullResultExample
 * <p>
 *   <p><strong>📥 Request</strong>
 *   <dl>
 *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
 *     <dd>"0x0"</dd>
 *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
 *     <dd>"0x0"</dd>
 *   </dl>
 *   </p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Block {
  private final String difficulty;
  private final String extraData;
  private final String gasLimit;
  private final String gasUsed;
  private final String hash;
  private final String logsBloom;
  private final String miner;
  private final String nonce;
  private final String number;
  private final String parentHash;
  private final String receiptsRoot;
  private final String sha3Uncles;
  private final String size;
  private final String stateRoot;
  private final String timestamp;
  private final String totalDifficulty;
  private final List<TransactionOrTransactionHash> transactions;
  private final String transactionsRoot;
  private final List<String> uncles;

  public Block(
    String number,
    String hash,
    String parentHash,
    String nonce,
    String sha3Uncles,
    String logsBloom,
    String transactionsRoot,
    String stateRoot,
    String receiptsRoot,
    String miner,
    String difficulty,
    String totalDifficulty,
    String extraData,
    String size,
    String gasLimit,
    String gasUsed,
    String timestamp,
    List<TransactionOrTransactionHash> transactions,
    List<String> uncles
  ) {
    this.number = number;
    this.hash = hash;
    this.parentHash = parentHash;
    this.nonce = nonce;
    this.sha3Uncles = sha3Uncles;
    this.logsBloom = logsBloom;
    this.transactionsRoot = transactionsRoot;
    this.stateRoot = stateRoot;
    this.receiptsRoot = receiptsRoot;
    this.miner = miner;
    this.difficulty = difficulty;
    this.totalDifficulty = totalDifficulty;
    this.extraData = extraData;
    this.size = size;
    this.gasLimit = gasLimit;
    this.gasUsed = gasUsed;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.uncles = uncles;
  }

  /**
   * Integer of the difficulty for this block
   */
  public String getDifficulty() {
    return this.difficulty;
  }

  /**
   * The 'extra data' field of this block
   */
  public String getExtraData() {
    return this.extraData;
  }

  /**
   * The maximum gas allowed in this block
   */
  public String getGasLimit() {
    return this.gasLimit;
  }

  /**
   * The total used gas by all transactions in this block
   */
  public String getGasUsed() {
    return this.gasUsed;
  }

  /**
   * The block hash or null when its the pending block
   * <p>
   * Hex representation of a Keccak 256 hash
   */
  public String getHash() {
    return this.hash;
  }

  /**
   * The bloom filter for the logs of the block or null when its the pending block
   */
  public String getLogsBloom() {
    return this.logsBloom;
  }

  public String getMiner() {
    return this.miner;
  }

  /**
   * Randomly selected number to satisfy the proof-of-work or null when its the pending block
   * <p>
   * A number only to be used once
   */
  public String getNonce() {
    return this.nonce;
  }

  /**
   * The block number or null when its the pending block
   * <p>
   * The hex representation of the block's height
   */
  public String getNumber() {
    return this.number;
  }

  /**
   * The hex representation of the Keccak 256 of the RLP encoded block<hr />
   * <strong>Example #1</strong> - nullExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#blockHash}</dt>
   *     <dd>"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"</dd>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getParentHash() {
    return this.parentHash;
  }

  /**
   * The root of the receipts trie of the block
   */
  public String getReceiptsRoot() {
    return this.receiptsRoot;
  }

  /**
   * Keccak hash of the uncles data in the block
   */
  public String getSha3Uncles() {
    return this.sha3Uncles;
  }

  /**
   * Integer the size of this block in bytes
   */
  public String getSize() {
    return this.size;
  }

  /**
   * The root of the final state trie of the block
   */
  public String getStateRoot() {
    return this.stateRoot;
  }

  /**
   * The unix timestamp for when the block was collated
   */
  public String getTimestamp() {
    return this.timestamp;
  }

  /**
   * Integer of the total difficulty of the chain until this block
   * <p>
   * Hex representation of the integer
   */
  public String getTotalDifficulty() {
    return this.totalDifficulty;
  }

  public List<TransactionOrTransactionHash> getTransactions() {
    return this.transactions;
  }

  /**
   * The root of the transactions trie of the block.
   */
  public String getTransactionsRoot() {
    return this.transactionsRoot;
  }

  public List<String> getUncles() {
    return this.uncles;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.function.Function;

/**
 * TransactionHash: Keccak 256 Hash of the RLP encoding of a transaction
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class TransactionOrTransactionHash {
  private final Object _raw;
  private String _string;
  private Transaction _transaction;

  public TransactionOrTransactionHash(Object raw) {
    this._raw = raw;
  }

  public Object getRaw() {
    return this._raw;
  }

  public String getString(Function<Object, String> transformer) {
    if (this._string != null) {
      return this._string;
    }
    return this._string = transformer.apply(this._raw);
  }

  public Transaction getTransaction(Function<Object, Transaction> transformer) {
    if (this._transaction != null) {
      return this._transaction;
    }
    return this._transaction = transformer.apply(this._raw);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Gets a block for a given number
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetBlockByNumberRequest extends JsonRpcRequest<EthGetBlockByNumberRequestParams> {
  public EthGetBlockByNumberRequest(String id, EthGetBlockByNumberRequestParams params) {
    super(id, "eth_getBlockByNumber", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetBlockByNumberRequestParams extends JsonRpcRequestParams {
  private final BlockNumberOrTag blockNumber;
  private final boolean includeTransactions;

  public EthGetBlockByNumberRequestParams(BlockNumberOrTag blockNumber, boolean includeTransactions) {
    this.blockNumber = blockNumber;
    this.includeTransactions = includeTransactions;
  }

  /**
   * BlockNumber: The hex representation of the block's height<hr /><strong>Example #1</strong> - nullResultExample
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   * BlockNumberTag: The optional block height description
   */
  public BlockNumberOrTag getBlockNumber() {
    return this.blockNumber;
  }

  public boolean isIncludeTransactions() {
    return this.includeTransactions;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Gets a block for a given number
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetBlockByNumberResponse extends JsonRpcResponse<Block> {
  public EthGetBlockByNumberResponse(String id, Block result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the number of transactions in a block from a block matching the given block hash.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetBlockTransactionCountByHashRequest extends JsonRpcRequest<EthGetBlockTransactionCountByHashRequestParams> {
  public EthGetBlockTransactionCountByHashRequest(String id, EthGetBlockTransactionCountByHashRequestParams params) {
    super(id, "eth_getBlockTransactionCountByHash", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetBlockTransactionCountByHashRequestParams extends JsonRpcRequestParams {
  private final String blockHash;

  public EthGetBlockTransactionCountByHashRequestParams(String blockHash) {
    this.blockHash = blockHash;
  }

  /**
   * The hex representation of the Keccak 256 of the RLP encoded block<hr />
   * <strong>Example #1</strong> - nullExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#blockHash}</dt>
   *     <dd>"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"</dd>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getBlockHash() {
    return this.blockHash;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the number of transactions in a block from a block matching the given block hash.
 * <p>As response: The Number of total transactions in the given block</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetBlockTransactionCountByHashResponse extends JsonRpcResponse<String> {
  public EthGetBlockTransactionCountByHashResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the number of transactions in a block from a block matching the given block number.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetBlockTransactionCountByNumberRequest extends JsonRpcRequest<EthGetBlockTransactionCountByNumberRequestParams> {
  public EthGetBlockTransactionCountByNumberRequest(String id, EthGetBlockTransactionCountByNumberRequestParams params) {
    super(id, "eth_getBlockTransactionCountByNumber", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetBlockTransactionCountByNumberRequestParams extends JsonRpcRequestParams {
  private final BlockNumberOrTag blockNumber;

  public EthGetBlockTransactionCountByNumberRequestParams(BlockNumberOrTag blockNumber) {
    this.blockNumber = blockNumber;
  }

  /**
   * BlockNumber: The hex representation of the block's height<hr /><strong>Example #1</strong> - nullResultExample
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   * BlockNumberTag: The optional block height description
   */
  public BlockNumberOrTag getBlockNumber() {
    return this.blockNumber;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the number of transactions in a block from a block matching the given block number.
 * <p>As response: The Number of total transactions in the given block</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetBlockTransactionCountByNumberResponse extends JsonRpcResponse<String> {
  public EthGetBlockTransactionCountByNumberResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns code at a given contract address
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetCodeRequest extends JsonRpcRequest<EthGetCodeRequestParams> {
  public EthGetCodeRequest(String id, EthGetCodeRequestParams params) {
    super(id, "eth_getCode", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetCodeRequestParams extends JsonRpcRequestParams {
  private final String address;
  private final String blockNumber;

  public EthGetCodeRequestParams(String address, String blockNumber) {
    this.address = address;
    this.blockNumber = blockNumber;
  }

  public String getAddress() {
    return this.address;
  }

  /**
   * The hex representation of the block's height<hr />
   * <strong>Example #1</strong> - nullResultExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getBlockNumber() {
    return this.blockNumber;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns code at a given contract address
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetCodeResponse extends JsonRpcResponse<String> {
  public EthGetCodeResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Polling method for a filter, which returns an array of logs which occurred since last poll.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetFilterChangesRequest extends JsonRpcRequest<EthGetFilterChangesRequestParams> {
  public EthGetFilterChangesRequest(String id, EthGetFilterChangesRequestParams params) {
    super(id, "eth_getFilterChanges", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetFilterChangesRequestParams extends JsonRpcRequestParams {
  private final String filterId;

  public EthGetFilterChangesRequestParams(String filterId) {
    this.filterId = filterId;
  }

  /**
   * An identifier used to reference the filter.
   */
  public String getFilterId() {
    return this.filterId;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * Polling method for a filter, which returns an array of logs which occurred since last poll.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetFilterChangesResponse extends JsonRpcResponse<List<Log>> {
  public EthGetFilterChangesResponse(String id, List<Log> result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * An indexed event generated during a transaction
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Log {
  private final String address;
  private final String blockHash;
  private final String blockNumber;
  private final String data;
  private final String logIndex;
  private final boolean removed;
  private final List<String> topics;
  private final String transactionHash;
  private final String transactionIndex;

  public Log(
    String address,
    String blockHash,
    String blockNumber,
    String data,
    String logIndex,
    boolean removed,
    List<String> topics,
    String transactionHash,
    String transactionIndex
  ) {
    this.address = address;
    this.blockHash = blockHash;
    this.blockNumber = blockNumber;
    this.data = data;
    this.logIndex = logIndex;
    this.removed = removed;
    this.topics = topics;
    this.transactionHash = transactionHash;
    this.transactionIndex = transactionIndex;
  }

  /**
   * Sender of the transaction
   */
  public String getAddress() {
    return this.address;
  }

  /**
   * The hex representation of the Keccak 256 of the RLP encoded block<hr />
   * <strong>Example #1</strong> - nullExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#blockHash}</dt>
   *     <dd>"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"</dd>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getBlockHash() {
    return this.blockHash;
  }

  /**
   * The hex representation of the block's height<hr />
   * <strong>Example #1</strong> - nullResultExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getBlockNumber() {
    return this.blockNumber;
  }

  /**
   * The data/input string sent along with the transaction
   */
  public String getData() {
    return this.data;
  }

  /**
   * The index of the event within its transaction, null when its pending
   */
  public String getLogIndex() {
    return this.logIndex;
  }

  /**
   * Whether or not the log was orphaned off the main chain
   */
  public boolean isRemoved() {
    return this.removed;
  }

  public List<String> getTopics() {
    return this.topics;
  }

  /**
   * Keccak 256 Hash of the RLP encoding of a transaction
   */
  public String getTransactionHash() {
    return this.transactionHash;
  }

  /**
   * The index of the transaction. null when its pending
   * <p>
   * Hex representation of the integer
   */
  public String getTransactionIndex() {
    return this.transactionIndex;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns an array of all logs matching filter with given id.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetFilterLogsRequest extends JsonRpcRequest<EthGetFilterLogsRequestParams> {
  public EthGetFilterLogsRequest(String id, EthGetFilterLogsRequestParams params) {
    super(id, "eth_getFilterLogs", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetFilterLogsRequestParams extends JsonRpcRequestParams {
  private final String filterId;

  public EthGetFilterLogsRequestParams(String filterId) {
    this.filterId = filterId;
  }

  /**
   * An identifier used to reference the filter.
   */
  public String getFilterId() {
    return this.filterId;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * Returns an array of all logs matching filter with given id.
 * <p>As response: An array of all logs matching filter with given id.</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetFilterLogsResponse extends JsonRpcResponse<List<Log>> {
  public EthGetFilterLogsResponse(String id, List<Log> result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns raw transaction data of a transaction with the given hash.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetRawTransactionByHashRequest extends JsonRpcRequest<EthGetRawTransactionByHashRequestParams> {
  public EthGetRawTransactionByHashRequest(String id, EthGetRawTransactionByHashRequestParams params) {
    super(id, "eth_getRawTransactionByHash", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetRawTransactionByHashRequestParams extends JsonRpcRequestParams {
  private final String transactionHash;

  public EthGetRawTransactionByHashRequestParams(String transactionHash) {
    this.transactionHash = transactionHash;
  }

  /**
   * Keccak 256 Hash of the RLP encoding of a transaction
   */
  public String getTransactionHash() {
    return this.transactionHash;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns raw transaction data of a transaction with the given hash.
 * <p>As response: The raw transaction data</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetRawTransactionByHashResponse extends JsonRpcResponse<String> {
  public EthGetRawTransactionByHashResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns raw transaction data of a transaction with the block hash and index of which it was mined.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetRawTransactionByBlockHashAndIndexRequest extends JsonRpcRequest<EthGetRawTransactionByBlockHashAndIndexRequestParams> {
  public EthGetRawTransactionByBlockHashAndIndexRequest(String id, EthGetRawTransactionByBlockHashAndIndexRequestParams params) {
    super(id, "eth_getRawTransactionByBlockHashAndIndex", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetRawTransactionByBlockHashAndIndexRequestParams extends JsonRpcRequestParams {
  private final String blockHash;
  private final String index;

  public EthGetRawTransactionByBlockHashAndIndexRequestParams(String blockHash, String index) {
    this.blockHash = blockHash;
    this.index = index;
  }

  /**
   * The hex representation of the Keccak 256 of the RLP encoded block<hr />
   * <strong>Example #1</strong> - nullExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#blockHash}</dt>
   *     <dd>"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"</dd>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getBlockHash() {
    return this.blockHash;
  }

  /**
   * Hex representation of the integer<hr />
   * <strong>Example #1</strong> - nullExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#blockHash}</dt>
   *     <dd>"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"</dd>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   * <hr />
   * <strong>Example #2</strong> - nullResultExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getIndex() {
    return this.index;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns raw transaction data of a transaction with the block hash and index of which it was mined.
 * <p>As response: The raw transaction data</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetRawTransactionByBlockHashAndIndexResponse extends JsonRpcResponse<String> {
  public EthGetRawTransactionByBlockHashAndIndexResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns raw transaction data of a transaction with the block number and index of which it was mined.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetRawTransactionByBlockNumberAndIndexRequest extends JsonRpcRequest<EthGetRawTransactionByBlockNumberAndIndexRequestParams> {
  public EthGetRawTransactionByBlockNumberAndIndexRequest(String id, EthGetRawTransactionByBlockNumberAndIndexRequestParams params) {
    super(id, "eth_getRawTransactionByBlockNumberAndIndex", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetRawTransactionByBlockNumberAndIndexRequestParams extends JsonRpcRequestParams {
  private final BlockNumberOrTag blockNumber;
  private final String index;

  public EthGetRawTransactionByBlockNumberAndIndexRequestParams(BlockNumberOrTag blockNumber, String index) {
    this.blockNumber = blockNumber;
    this.index = index;
  }

  /**
   * BlockNumber: The hex representation of the block's height<hr /><strong>Example #1</strong> - nullResultExample
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   * BlockNumberTag: The optional block height description
   */
  public BlockNumberOrTag getBlockNumber() {
    return this.blockNumber;
  }

  /**
   * Hex representation of the integer<hr />
   * <strong>Example #1</strong> - nullExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#blockHash}</dt>
   *     <dd>"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"</dd>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   * <hr />
   * <strong>Example #2</strong> - nullResultExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getIndex() {
    return this.index;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns raw transaction data of a transaction with the block number and index of which it was mined.
 * <p>As response: The raw transaction data</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetRawTransactionByBlockNumberAndIndexResponse extends JsonRpcResponse<String> {
  public EthGetRawTransactionByBlockNumberAndIndexResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns an array of all logs matching a given filter object.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetLogsRequest extends JsonRpcRequest<EthGetLogsRequestParams> {
  public EthGetLogsRequest(String id, EthGetLogsRequestParams params) {
    super(id, "eth_getLogs", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.function.Function;
import java.util.List;

/**
 * Addresses: List of contract addresses from which to monitor events
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class OneOrArrayOfAddresses {
  private final Object _raw;
  private List<String> _arrayOfString;
  private String _string;

  public OneOrArrayOfAddresses(Object raw) {
    this._raw = raw;
  }

  public List<String> getArrayOfString(Function<Object, List<String>> transformer) {
    if (this._arrayOfString != null) {
      return this._arrayOfString;
    }
    return this._arrayOfString = transformer.apply(this._raw);
  }

  public Object getRaw() {
    return this._raw;
  }

  public String getString(Function<Object, String> transformer) {
    if (this._string != null) {
      return this._string;
    }
    return this._string = transformer.apply(this._raw);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * A filter used to monitor the blockchain for log/events
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Filter {
  private final OneOrArrayOfAddresses address;
  private final String fromBlock;
  private final String toBlock;
  private final List<String> topics;

  public Filter(String fromBlock, String toBlock, OneOrArrayOfAddresses address, List<String> topics) {
    this.fromBlock = fromBlock;
    this.toBlock = toBlock;
    this.address = address;
    this.topics = topics;
  }

  /**
   * Addresses: List of contract addresses from which to monitor events
   */
  public OneOrArrayOfAddresses getAddress() {
    return this.address;
  }

  /**
   * The hex representation of the block's height<hr />
   * <strong>Example #1</strong> - nullResultExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getFromBlock() {
    return this.fromBlock;
  }

  /**
   * The hex representation of the block's height<hr />
   * <strong>Example #1</strong> - nullResultExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getToBlock() {
    return this.toBlock;
  }

  public List<String> getTopics() {
    return this.topics;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetLogsRequestParams extends JsonRpcRequestParams {
  private final Filter filter;

  public EthGetLogsRequestParams(Filter filter) {
    this.filter = filter;
  }

  /**
   * A filter used to monitor the blockchain for log/events
   */
  public Filter getFilter() {
    return this.filter;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * Returns an array of all logs matching a given filter object.
 * <p>As response: An array of all logs matching filter with given id.</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetLogsResponse extends JsonRpcResponse<List<Log>> {
  public EthGetLogsResponse(String id, List<Log> result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Gets a storage value from a contract address, a position, and an optional blockNumber
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetStorageAtRequest extends JsonRpcRequest<EthGetStorageAtRequestParams> {
  public EthGetStorageAtRequest(String id, EthGetStorageAtRequestParams params) {
    super(id, "eth_getStorageAt", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetStorageAtRequestParams extends JsonRpcRequestParams {
  private final String address;
  private final BlockNumberOrTag blockNumber;
  private final String key;

  public EthGetStorageAtRequestParams(String address, String key, BlockNumberOrTag blockNumber) {
    this.address = address;
    this.key = key;
    this.blockNumber = blockNumber;
  }

  public String getAddress() {
    return this.address;
  }

  /**
   * BlockNumber: The hex representation of the block's height<hr /><strong>Example #1</strong> - nullResultExample
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   * BlockNumberTag: The optional block height description
   */
  public BlockNumberOrTag getBlockNumber() {
    return this.blockNumber;
  }

  /**
   * Hex representation of the storage slot where the variable exists
   */
  public String getKey() {
    return this.key;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Gets a storage value from a contract address, a position, and an optional blockNumber
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetStorageAtResponse extends JsonRpcResponse<String> {
  public EthGetStorageAtResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the information about a transaction requested by the block hash and index of which it was mined.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetTransactionByBlockHashAndIndexRequest extends JsonRpcRequest<EthGetTransactionByBlockHashAndIndexRequestParams> {
  public EthGetTransactionByBlockHashAndIndexRequest(String id, EthGetTransactionByBlockHashAndIndexRequestParams params) {
    super(id, "eth_getTransactionByBlockHashAndIndex", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetTransactionByBlockHashAndIndexRequestParams extends JsonRpcRequestParams {
  private final String blockHash;
  private final String index;

  public EthGetTransactionByBlockHashAndIndexRequestParams(String blockHash, String index) {
    this.blockHash = blockHash;
    this.index = index;
  }

  /**
   * The hex representation of the Keccak 256 of the RLP encoded block<hr />
   * <strong>Example #1</strong> - nullExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#blockHash}</dt>
   *     <dd>"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"</dd>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getBlockHash() {
    return this.blockHash;
  }

  /**
   * Hex representation of the integer<hr />
   * <strong>Example #1</strong> - nullExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#blockHash}</dt>
   *     <dd>"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"</dd>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   * <hr />
   * <strong>Example #2</strong> - nullResultExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getIndex() {
    return this.index;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the information about a transaction requested by the block hash and index of which it was mined.
 * <p>As response: Returns a transaction or null</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetTransactionByBlockHashAndIndexResponse extends JsonRpcResponse<SchemasTransaction> {
  public EthGetTransactionByBlockHashAndIndexResponse(String id, SchemasTransaction result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * <hr />
 * <strong>Example #1</strong> - nullExample
 * <p>
 *   <p><strong>📥 Request</strong>
 *   <dl>
 *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#blockHash}</dt>
 *     <dd>"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"</dd>
 *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#index}</dt>
 *     <dd>"0x0"</dd>
 *   </dl>
 *   </p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class SchemasTransaction {
  private final String blockHash;
  private final String blockNumber;
  private final String from;
  private final String gas;
  private final String gasPrice;
  private final String hash;
  private final String input;
  private final String nonce;
  private final String r;
  private final String s;
  private final String to;
  private final String transactionIndex;
  private final String v;
  private final String value;

  public SchemasTransaction(
    String blockHash,
    String blockNumber,
    String from,
    String gas,
    String gasPrice,
    String hash,
    String input,
    String nonce,
    String to,
    String transactionIndex,
    String value,
    String v,
    String r,
    String s
  ) {
    this.blockHash = blockHash;
    this.blockNumber = blockNumber;
    this.from = from;
    this.gas = gas;
    this.gasPrice = gasPrice;
    this.hash = hash;
    this.input = input;
    this.nonce = nonce;
    this.to = to;
    this.transactionIndex = transactionIndex;
    this.value = value;
    this.v = v;
    this.r = r;
    this.s = s;
  }

  /**
   * The block hash or null when its the pending block
   * <p>
   * Hex representation of a Keccak 256 hash
   */
  public String getBlockHash() {
    return this.blockHash;
  }

  /**
   * The block number or null when its the pending block
   * <p>
   * The hex representation of the block's height
   */
  public String getBlockNumber() {
    return this.blockNumber;
  }

  /**
   * The sender of the transaction
   */
  public String getFrom() {
    return this.from;
  }

  /**
   * The gas limit provided by the sender in Wei
   */
  public String getGas() {
    return this.gas;
  }

  /**
   * The gas price willing to be paid by the sender in Wei
   */
  public String getGasPrice() {
    return this.gasPrice;
  }

  /**
   * Keccak 256 Hash of the RLP encoding of a transaction
   */
  public String getHash() {
    return this.hash;
  }

  /**
   * The data field sent with the transaction
   */
  public String getInput() {
    return this.input;
  }

  /**
   * The total number of prior transactions made by the sender
   */
  public String getNonce() {
    return this.nonce;
  }

  /**
   * ECDSA signature r
   */
  public String getR() {
    return this.r;
  }

  /**
   * ECDSA signature s
   */
  public String getS() {
    return this.s;
  }

  /**
   * Destination address of the transaction. Null if it was a contract create.
   */
  public String getTo() {
    return this.to;
  }

  /**
   * The index of the transaction. null when its pending
   * <p>
   * Hex representation of the integer
   */
  public String getTransactionIndex() {
    return this.transactionIndex;
  }

  /**
   * ECDSA recovery id
   */
  public String getV() {
    return this.v;
  }

  /**
   * Value of Ether being transferred in Wei
   */
  public String getValue() {
    return this.value;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the information about a transaction requested by the block number and index of which it was mined.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetTransactionByBlockNumberAndIndexRequest extends JsonRpcRequest<EthGetTransactionByBlockNumberAndIndexRequestParams> {
  public EthGetTransactionByBlockNumberAndIndexRequest(String id, EthGetTransactionByBlockNumberAndIndexRequestParams params) {
    super(id, "eth_getTransactionByBlockNumberAndIndex", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetTransactionByBlockNumberAndIndexRequestParams extends JsonRpcRequestParams {
  private final BlockNumberOrTag blockNumber;
  private final String index;

  public EthGetTransactionByBlockNumberAndIndexRequestParams(BlockNumberOrTag blockNumber, String index) {
    this.blockNumber = blockNumber;
    this.index = index;
  }

  /**
   * BlockNumber: The hex representation of the block's height<hr /><strong>Example #1</strong> - nullResultExample
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   * BlockNumberTag: The optional block height description
   */
  public BlockNumberOrTag getBlockNumber() {
    return this.blockNumber;
  }

  /**
   * Hex representation of the integer<hr />
   * <strong>Example #1</strong> - nullExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#blockHash}</dt>
   *     <dd>"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"</dd>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   * <hr />
   * <strong>Example #2</strong> - nullResultExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getIndex() {
    return this.index;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the information about a transaction requested by the block number and index of which it was mined.
 * <p>As response: Returns a transaction or null</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetTransactionByBlockNumberAndIndexResponse extends JsonRpcResponse<SchemasTransaction> {
  public EthGetTransactionByBlockNumberAndIndexResponse(String id, SchemasTransaction result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the information about a transaction requested by transaction hash.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetTransactionByHashRequest extends JsonRpcRequest<EthGetTransactionByHashRequestParams> {
  public EthGetTransactionByHashRequest(String id, EthGetTransactionByHashRequestParams params) {
    super(id, "eth_getTransactionByHash", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetTransactionByHashRequestParams extends JsonRpcRequestParams {
  private final String transactionHash;

  public EthGetTransactionByHashRequestParams(String transactionHash) {
    this.transactionHash = transactionHash;
  }

  /**
   * Keccak 256 Hash of the RLP encoding of a transaction
   */
  public String getTransactionHash() {
    return this.transactionHash;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the information about a transaction requested by transaction hash.
 * <p>As response: Returns a transaction or null</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetTransactionByHashResponse extends JsonRpcResponse<SchemasTransaction> {
  public EthGetTransactionByHashResponse(String id, SchemasTransaction result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the number of transactions sent from an address
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetTransactionCountRequest extends JsonRpcRequest<EthGetTransactionCountRequestParams> {
  public EthGetTransactionCountRequest(String id, EthGetTransactionCountRequestParams params) {
    super(id, "eth_getTransactionCount", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetTransactionCountRequestParams extends JsonRpcRequestParams {
  private final String address;
  private final BlockNumberOrTag blockNumber;

  public EthGetTransactionCountRequestParams(String address, BlockNumberOrTag blockNumber) {
    this.address = address;
    this.blockNumber = blockNumber;
  }

  public String getAddress() {
    return this.address;
  }

  /**
   * BlockNumber: The hex representation of the block's height<hr /><strong>Example #1</strong> - nullResultExample
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   * BlockNumberTag: The optional block height description
   */
  public BlockNumberOrTag getBlockNumber() {
    return this.blockNumber;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the number of transactions sent from an address
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetTransactionCountResponse extends JsonRpcResponse<String> {
  public EthGetTransactionCountResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the receipt information of a transaction by its hash.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetTransactionReceiptRequest extends JsonRpcRequest<EthGetTransactionReceiptRequestParams> {
  public EthGetTransactionReceiptRequest(String id, EthGetTransactionReceiptRequestParams params) {
    super(id, "eth_getTransactionReceipt", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetTransactionReceiptRequestParams extends JsonRpcRequestParams {
  private final String transactionHash;

  public EthGetTransactionReceiptRequestParams(String transactionHash) {
    this.transactionHash = transactionHash;
  }

  /**
   * Keccak 256 Hash of the RLP encoding of a transaction
   */
  public String getTransactionHash() {
    return this.transactionHash;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the receipt information of a transaction by its hash.
 * <p>As response: returns either a receipt or null</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetTransactionReceiptResponse extends JsonRpcResponse<Receipt> {
  public EthGetTransactionReceiptResponse(String id, Receipt result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * The receipt of a transaction
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Receipt {
  private final String blockHash;
  private final String blockNumber;
  private final String contractAddress;
  private final String cumulativeGasUsed;
  private final String from;
  private final String gasUsed;
  private final List<Log> logs;
  private final String logsBloom;
  private final String postTransactionState;
  private final boolean status;
  private final String to;
  private final String transactionHash;
  private final String transactionIndex;

  public Receipt(
    String blockHash,
    String blockNumber,
    String contractAddress,
    String cumulativeGasUsed,
    String from,
    String gasUsed,
    List<Log> logs,
    String logsBloom,
    String to,
    String transactionHash,
    String transactionIndex,
    String postTransactionState,
    boolean status
  ) {
    this.blockHash = blockHash;
    this.blockNumber = blockNumber;
    this.contractAddress = contractAddress;
    this.cumulativeGasUsed = cumulativeGasUsed;
    this.from = from;
    this.gasUsed = gasUsed;
    this.logs = logs;
    this.logsBloom = logsBloom;
    this.to = to;
    this.transactionHash = transactionHash;
    this.transactionIndex = transactionIndex;
    this.postTransactionState = postTransactionState;
    this.status = status;
  }

  /**
   * The hex representation of the Keccak 256 of the RLP encoded block<hr />
   * <strong>Example #1</strong> - nullExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#blockHash}</dt>
   *     <dd>"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"</dd>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getBlockHash() {
    return this.blockHash;
  }

  /**
   * The hex representation of the block's height<hr />
   * <strong>Example #1</strong> - nullResultExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getBlockNumber() {
    return this.blockNumber;
  }

  /**
   * The contract address created, if the transaction was a contract creation, otherwise null
   */
  public String getContractAddress() {
    return this.contractAddress;
  }

  /**
   * The gas units used by the transaction
   */
  public String getCumulativeGasUsed() {
    return this.cumulativeGasUsed;
  }

  /**
   * The sender of the transaction
   */
  public String getFrom() {
    return this.from;
  }

  /**
   * The total gas used by the transaction
   */
  public String getGasUsed() {
    return this.gasUsed;
  }

  public List<Log> getLogs() {
    return this.logs;
  }

  /**
   * A 2048 bit bloom filter from the logs of the transaction. Each log sets 3 bits though taking the low-order 11 bits of each of the first three pairs of bytes in a Keccak 256 hash of the log's byte series
   */
  public String getLogsBloom() {
    return this.logsBloom;
  }

  /**
   * The intermediate stateRoot directly after transaction execution.
   */
  public String getPostTransactionState() {
    return this.postTransactionState;
  }

  /**
   * Whether or not the transaction threw an error.
   */
  public boolean isStatus() {
    return this.status;
  }

  /**
   * Destination address of the transaction. Null if it was a contract create.
   */
  public String getTo() {
    return this.to;
  }

  /**
   * Keccak 256 Hash of the RLP encoding of a transaction
   */
  public String getTransactionHash() {
    return this.transactionHash;
  }

  /**
   * The index of the transaction. null when its pending
   * <p>
   * Hex representation of the integer
   */
  public String getTransactionIndex() {
    return this.transactionIndex;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns information about a uncle of a block by hash and uncle index position.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetUncleByBlockHashAndIndexRequest extends JsonRpcRequest<EthGetUncleByBlockHashAndIndexRequestParams> {
  public EthGetUncleByBlockHashAndIndexRequest(String id, EthGetUncleByBlockHashAndIndexRequestParams params) {
    super(id, "eth_getUncleByBlockHashAndIndex", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetUncleByBlockHashAndIndexRequestParams extends JsonRpcRequestParams {
  private final String blockHash;
  private final String index;

  public EthGetUncleByBlockHashAndIndexRequestParams(String blockHash, String index) {
    this.blockHash = blockHash;
    this.index = index;
  }

  /**
   * The hex representation of the Keccak 256 of the RLP encoded block<hr />
   * <strong>Example #1</strong> - nullExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#blockHash}</dt>
   *     <dd>"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"</dd>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getBlockHash() {
    return this.blockHash;
  }

  /**
   * Hex representation of the integer<hr />
   * <strong>Example #1</strong> - nullExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#blockHash}</dt>
   *     <dd>"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"</dd>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   * <hr />
   * <strong>Example #2</strong> - nullResultExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getIndex() {
    return this.index;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns information about a uncle of a block by hash and uncle index position.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetUncleByBlockHashAndIndexResponse extends JsonRpcResponse<Block> {
  public EthGetUncleByBlockHashAndIndexResponse(String id, Block result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns information about a uncle of a block by hash and uncle index position.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetUncleByBlockNumberAndIndexRequest extends JsonRpcRequest<EthGetUncleByBlockNumberAndIndexRequestParams> {
  public EthGetUncleByBlockNumberAndIndexRequest(String id, EthGetUncleByBlockNumberAndIndexRequestParams params) {
    super(id, "eth_getUncleByBlockNumberAndIndex", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetUncleByBlockNumberAndIndexRequestParams extends JsonRpcRequestParams {
  private final String index;
  private final String uncleBlockNumber;

  public EthGetUncleByBlockNumberAndIndexRequestParams(String uncleBlockNumber, String index) {
    this.uncleBlockNumber = uncleBlockNumber;
    this.index = index;
  }

  /**
   * Hex representation of the integer<hr />
   * <strong>Example #1</strong> - nullExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#blockHash}</dt>
   *     <dd>"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"</dd>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   * <hr />
   * <strong>Example #2</strong> - nullResultExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getIndex() {
    return this.index;
  }

  /**
   * The hex representation of the block's height<hr />
   * <strong>Example #1</strong> - nullResultExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getUncleBlockNumber() {
    return this.uncleBlockNumber;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns information about a uncle of a block by hash and uncle index position.
 * <p>As response: returns an uncle block or null</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetUncleByBlockNumberAndIndexResponse extends JsonRpcResponse<Block> {
  public EthGetUncleByBlockNumberAndIndexResponse(String id, Block result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the number of uncles in a block from a block matching the given block hash.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetUncleCountByBlockHashRequest extends JsonRpcRequest<EthGetUncleCountByBlockHashRequestParams> {
  public EthGetUncleCountByBlockHashRequest(String id, EthGetUncleCountByBlockHashRequestParams params) {
    super(id, "eth_getUncleCountByBlockHash", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetUncleCountByBlockHashRequestParams extends JsonRpcRequestParams {
  private final String blockHash;

  public EthGetUncleCountByBlockHashRequestParams(String blockHash) {
    this.blockHash = blockHash;
  }

  /**
   * The hex representation of the Keccak 256 of the RLP encoded block<hr />
   * <strong>Example #1</strong> - nullExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#blockHash}</dt>
   *     <dd>"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"</dd>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getBlockHash() {
    return this.blockHash;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the number of uncles in a block from a block matching the given block hash.
 * <p>As response: The Number of total uncles in the given block</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetUncleCountByBlockHashResponse extends JsonRpcResponse<String> {
  public EthGetUncleCountByBlockHashResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the number of uncles in a block from a block matching the given block number.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetUncleCountByBlockNumberRequest extends JsonRpcRequest<EthGetUncleCountByBlockNumberRequestParams> {
  public EthGetUncleCountByBlockNumberRequest(String id, EthGetUncleCountByBlockNumberRequestParams params) {
    super(id, "eth_getUncleCountByBlockNumber", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetUncleCountByBlockNumberRequestParams extends JsonRpcRequestParams {
  private final BlockNumberOrTag blockNumber;

  public EthGetUncleCountByBlockNumberRequestParams(BlockNumberOrTag blockNumber) {
    this.blockNumber = blockNumber;
  }

  /**
   * BlockNumber: The hex representation of the block's height<hr /><strong>Example #1</strong> - nullResultExample
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   * BlockNumberTag: The optional block height description
   */
  public BlockNumberOrTag getBlockNumber() {
    return this.blockNumber;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the number of uncles in a block from a block matching the given block number.
 * <p>As response: The Number of total uncles in the given block</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetUncleCountByBlockNumberResponse extends JsonRpcResponse<String> {
  public EthGetUncleCountByBlockNumberResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the account- and storage-values of the specified account including the Merkle-proof.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetProofRequest extends JsonRpcRequest<EthGetProofRequestParams> {
  public EthGetProofRequest(String id, EthGetProofRequestParams params) {
    super(id, "eth_getProof", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetProofRequestParams extends JsonRpcRequestParams {
  private final String address;
  private final BlockNumberOrTag blockNumber;
  private final List<String> storageKeys;

  public EthGetProofRequestParams(String address, List<String> storageKeys, BlockNumberOrTag blockNumber) {
    this.address = address;
    this.storageKeys = storageKeys;
    this.blockNumber = blockNumber;
  }

  public String getAddress() {
    return this.address;
  }

  /**
   * BlockNumber: The hex representation of the block's height<hr /><strong>Example #1</strong> - nullResultExample
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   * BlockNumberTag: The optional block height description
   */
  public BlockNumberOrTag getBlockNumber() {
    return this.blockNumber;
  }

  public List<String> getStorageKeys() {
    return this.storageKeys;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the account- and storage-values of the specified account including the Merkle-proof.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetProofResponse extends JsonRpcResponse<ProofAccount> {
  public EthGetProofResponse(String id, ProofAccount result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * The merkle proofs of the specified account connecting them to the blockhash of the block specified
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ProofAccount {
  private final List<String> accountProof;
  private final String address;
  private final String balance;
  private final String codeHash;
  private final String nonce;
  private final String storageHash;
  private final List<StorageProof> storageProof;

  public ProofAccount(
    String address,
    List<String> accountProof,
    String balance,
    String codeHash,
    String nonce,
    String storageHash,
    List<StorageProof> storageProof
  ) {
    this.address = address;
    this.accountProof = accountProof;
    this.balance = balance;
    this.codeHash = codeHash;
    this.nonce = nonce;
    this.storageHash = storageHash;
    this.storageProof = storageProof;
  }

  public List<String> getAccountProof() {
    return this.accountProof;
  }

  /**
   * The address of the account or contract of the request
   */
  public String getAddress() {
    return this.address;
  }

  /**
   * The Ether balance of the account or contract of the request
   */
  public String getBalance() {
    return this.balance;
  }

  /**
   * The code hash of the contract of the request (keccak(NULL) if external account)
   */
  public String getCodeHash() {
    return this.codeHash;
  }

  /**
   * The transaction count of the account or contract of the request
   */
  public String getNonce() {
    return this.nonce;
  }

  /**
   * The storage hash of the contract of the request (keccak(rlp(NULL)) if external account)
   */
  public String getStorageHash() {
    return this.storageHash;
  }

  public List<StorageProof> getStorageProof() {
    return this.storageProof;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Object proving a relationship of a storage value to an account's storageHash.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class StorageProof {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the hash of the current block, the seedHash, and the boundary condition to be met ('target').
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetWorkRequest extends JsonRpcRequest<EthGetWorkRequestParams> {
  public EthGetWorkRequest(String id, EthGetWorkRequestParams params) {
    super(id, "eth_getWork", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetWorkRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the hash of the current block, the seedHash, and the boundary condition to be met ('target').
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthGetWorkResponse extends JsonRpcResponse<TupleOfStringStringString> {
  public EthGetWorkResponse(String id, TupleOfStringStringString result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the number of hashes per second that the node is mining with.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthHashrateRequest extends JsonRpcRequest<EthHashrateRequestParams> {
  public EthHashrateRequest(String id, EthHashrateRequestParams params) {
    super(id, "eth_hashrate", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthHashrateRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the number of hashes per second that the node is mining with.
 * <p>As response: Integer of the number of hashes per second</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthHashrateResponse extends JsonRpcResponse<String> {
  public EthHashrateResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns true if client is actively mining new blocks.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthMiningRequest extends JsonRpcRequest<EthMiningRequestParams> {
  public EthMiningRequest(String id, EthMiningRequestParams params) {
    super(id, "eth_mining", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthMiningRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns true if client is actively mining new blocks.
 * <p>As response: Whether or not the client is mining</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthMiningResponse extends JsonRpcResponse<Boolean> {
  public EthMiningResponse(String id, boolean result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Creates a filter in the node, to notify when a new block arrives. To check if the state has changed, call eth_getFilterChanges.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthNewBlockFilterRequest extends JsonRpcRequest<EthNewBlockFilterRequestParams> {
  public EthNewBlockFilterRequest(String id, EthNewBlockFilterRequestParams params) {
    super(id, "eth_newBlockFilter", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthNewBlockFilterRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Creates a filter in the node, to notify when a new block arrives. To check if the state has changed, call eth_getFilterChanges.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthNewBlockFilterResponse extends JsonRpcResponse<String> {
  public EthNewBlockFilterResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Creates a filter object, based on filter options, to notify when the state changes (logs). To check if the state has changed, call eth_getFilterChanges.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthNewFilterRequest extends JsonRpcRequest<EthNewFilterRequestParams> {
  public EthNewFilterRequest(String id, EthNewFilterRequestParams params) {
    super(id, "eth_newFilter", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthNewFilterRequestParams extends JsonRpcRequestParams {
  private final Filter filter;

  public EthNewFilterRequestParams(Filter filter) {
    this.filter = filter;
  }

  /**
   * A filter used to monitor the blockchain for log/events
   */
  public Filter getFilter() {
    return this.filter;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Creates a filter object, based on filter options, to notify when the state changes (logs). To check if the state has changed, call eth_getFilterChanges.
 * <p>As response: The filter ID for use in <code>eth_getFilterChanges</code></p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthNewFilterResponse extends JsonRpcResponse<String> {
  public EthNewFilterResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Creates a filter in the node, to notify when new pending transactions arrive. To check if the state has changed, call eth_getFilterChanges.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthNewPendingTransactionFilterRequest extends JsonRpcRequest<EthNewPendingTransactionFilterRequestParams> {
  public EthNewPendingTransactionFilterRequest(String id, EthNewPendingTransactionFilterRequestParams params) {
    super(id, "eth_newPendingTransactionFilter", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthNewPendingTransactionFilterRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Creates a filter in the node, to notify when new pending transactions arrive. To check if the state has changed, call eth_getFilterChanges.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthNewPendingTransactionFilterResponse extends JsonRpcResponse<String> {
  public EthNewPendingTransactionFilterResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the transactions that are pending in the transaction pool and have a from address that is one of the accounts this node manages.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthPendingTransactionsRequest extends JsonRpcRequest<EthPendingTransactionsRequestParams> {
  public EthPendingTransactionsRequest(String id, EthPendingTransactionsRequestParams params) {
    super(id, "eth_pendingTransactions", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthPendingTransactionsRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * Returns the transactions that are pending in the transaction pool and have a from address that is one of the accounts this node manages.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthPendingTransactionsResponse extends JsonRpcResponse<List<Transaction>> {
  public EthPendingTransactionsResponse(String id, List<Transaction> result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the current ethereum protocol version.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthProtocolVersionRequest extends JsonRpcRequest<EthProtocolVersionRequestParams> {
  public EthProtocolVersionRequest(String id, EthProtocolVersionRequestParams params) {
    super(id, "eth_protocolVersion", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthProtocolVersionRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns the current ethereum protocol version.
 * <p>As response: The current ethereum protocol version</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthProtocolVersionResponse extends JsonRpcResponse<String> {
  public EthProtocolVersionResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Creates new message call transaction or a contract creation for signed transactions.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthSendRawTransactionRequest extends JsonRpcRequest<EthSendRawTransactionRequestParams> {
  public EthSendRawTransactionRequest(String id, EthSendRawTransactionRequestParams params) {
    super(id, "eth_sendRawTransaction", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthSendRawTransactionRequestParams extends JsonRpcRequestParams {
  private final String signedTransactionData;

  public EthSendRawTransactionRequestParams(String signedTransactionData) {
    this.signedTransactionData = signedTransactionData;
  }

  /**
   * Hex representation of a variable length byte array
   */
  public String getSignedTransactionData() {
    return this.signedTransactionData;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Creates new message call transaction or a contract creation for signed transactions.
 * <p>As response: The transaction hash, or the zero hash if the transaction is not yet available.</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthSendRawTransactionResponse extends JsonRpcResponse<String> {
  public EthSendRawTransactionResponse(String id, String result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Used for submitting mining hashrate.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthSubmitHashrateRequest extends JsonRpcRequest<EthSubmitHashrateRequestParams> {
  public EthSubmitHashrateRequest(String id, EthSubmitHashrateRequestParams params) {
    super(id, "eth_submitHashrate", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthSubmitHashrateRequestParams extends JsonRpcRequestParams {
  private final String hashRate;
  private final String id;

  public EthSubmitHashrateRequestParams(String hashRate, String id) {
    this.hashRate = hashRate;
    this.id = id;
  }

  /**
   * Hex representation of a 256 bit unit of data
   */
  public String getHashRate() {
    return this.hashRate;
  }

  /**
   * Hex representation of a 256 bit unit of data
   */
  public String getId() {
    return this.id;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Used for submitting mining hashrate.
 * <p>As response: whether of not submitting went through successfully</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthSubmitHashrateResponse extends JsonRpcResponse<Boolean> {
  public EthSubmitHashrateResponse(String id, boolean result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Used for submitting a proof-of-work solution.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthSubmitWorkRequest extends JsonRpcRequest<EthSubmitWorkRequestParams> {
  public EthSubmitWorkRequest(String id, EthSubmitWorkRequestParams params) {
    super(id, "eth_submitWork", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthSubmitWorkRequestParams extends JsonRpcRequestParams {
  private final String mixHash;
  private final String nonce;
  private final String powHash;

  public EthSubmitWorkRequestParams(String nonce, String powHash, String mixHash) {
    this.nonce = nonce;
    this.powHash = powHash;
    this.mixHash = mixHash;
  }

  /**
   * The mix digest.<hr />
   * <strong>Example #1</strong> - submitWorkExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthSubmitWorkRequestParams#nonce}</dt>
   *     <dd>"0x0000000000000001"</dd>
   *     <dt>{@link EthSubmitWorkRequestParams#powHash}</dt>
   *     <dd>"0x6bf2cAE0dE3ec3ecA5E194a6C6e02cf42aADfe1C2c4Fff12E5D36C3Cf7297F22"</dd>
   *     <dt>{@link EthSubmitWorkRequestParams#mixHash}</dt>
   *     <dd>"0xD1FE5700000000000000000000000000D1FE5700000000000000000000000000"</dd>
   *   </dl>
   *   </p>
   */
  public String getMixHash() {
    return this.mixHash;
  }

  /**
   * A number only to be used once<hr />
   * <strong>Example #1</strong> - submitWorkExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthSubmitWorkRequestParams#nonce}</dt>
   *     <dd>"0x0000000000000001"</dd>
   *     <dt>{@link EthSubmitWorkRequestParams#powHash}</dt>
   *     <dd>"0x6bf2cAE0dE3ec3ecA5E194a6C6e02cf42aADfe1C2c4Fff12E5D36C3Cf7297F22"</dd>
   *     <dt>{@link EthSubmitWorkRequestParams#mixHash}</dt>
   *     <dd>"0xD1FE5700000000000000000000000000D1FE5700000000000000000000000000"</dd>
   *   </dl>
   *   </p>
   */
  public String getNonce() {
    return this.nonce;
  }

  /**
   * Current block header PoW hash.<hr />
   * <strong>Example #1</strong> - submitWorkExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthSubmitWorkRequestParams#nonce}</dt>
   *     <dd>"0x0000000000000001"</dd>
   *     <dt>{@link EthSubmitWorkRequestParams#powHash}</dt>
   *     <dd>"0x6bf2cAE0dE3ec3ecA5E194a6C6e02cf42aADfe1C2c4Fff12E5D36C3Cf7297F22"</dd>
   *     <dt>{@link EthSubmitWorkRequestParams#mixHash}</dt>
   *     <dd>"0xD1FE5700000000000000000000000000D1FE5700000000000000000000000000"</dd>
   *   </dl>
   *   </p>
   */
  public String getPowHash() {
    return this.powHash;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Used for submitting a proof-of-work solution.
 * <p>As response: returns true if the provided solution is valid, otherwise false.</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthSubmitWorkResponse extends JsonRpcResponse<Boolean> {
  public EthSubmitWorkResponse(String id, boolean result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns an object with data about the sync status or false.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthSyncingRequest extends JsonRpcRequest<EthSyncingRequestParams> {
  public EthSyncingRequest(String id, EthSyncingRequestParams params) {
    super(id, "eth_syncing", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthSyncingRequestParams extends JsonRpcRequestParams {

}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Returns an object with data about the sync status or false.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthSyncingResponse extends JsonRpcResponse<IsSyncingResult> {
  public EthSyncingResponse(String id, IsSyncingResult result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.function.Function;
import java.util.function.Predicate;

/**
 * SyncingData: An object with sync status data
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class IsSyncingResult {
  private final Object _raw;
  private boolean _bool;
  private SyncingData _syncingData;

  public IsSyncingResult(Object raw) {
    this._raw = raw;
  }

  public boolean isBool(Predicate<Object> transformer) {
    if (this._bool != null) {
      return this._bool;
    }
    return this._bool = transformer.test(this._raw);
  }

  public Object getRaw() {
    return this._raw;
  }

  public SyncingData getSyncingData(Function<Object, SyncingData> transformer) {
    if (this._syncingData != null) {
      return this._syncingData;
    }
    return this._syncingData = transformer.apply(this._raw);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * An object with sync status data
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class SyncingData {
  private final String currentBlock;
  private final String highestBlock;
  private final String knownStates;
  private final String pulledStates;
  private final String startingBlock;

  public SyncingData(
    String startingBlock,
    String currentBlock,
    String highestBlock,
    String knownStates,
    String pulledStates
  ) {
    this.startingBlock = startingBlock;
    this.currentBlock = currentBlock;
    this.highestBlock = highestBlock;
    this.knownStates = knownStates;
    this.pulledStates = pulledStates;
  }

  /**
   * The current block, same as eth_blockNumber
   */
  public String getCurrentBlock() {
    return this.currentBlock;
  }

  /**
   * The estimated highest block
   */
  public String getHighestBlock() {
    return this.highestBlock;
  }

  /**
   * The known states
   */
  public String getKnownStates() {
    return this.knownStates;
  }

  /**
   * The pulled states
   */
  public String getPulledStates() {
    return this.pulledStates;
  }

  /**
   * Block at which the import started (will only be reset, after the sync reached his head)
   */
  public String getStartingBlock() {
    return this.startingBlock;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Uninstalls a filter with given id. Should always be called when watch is no longer needed. Additionally Filters timeout when they aren't requested with eth_getFilterChanges for a period of time.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthUninstallFilterRequest extends JsonRpcRequest<EthUninstallFilterRequestParams> {
  public EthUninstallFilterRequest(String id, EthUninstallFilterRequestParams params) {
    super(id, "eth_uninstallFilter", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthUninstallFilterRequestParams extends JsonRpcRequestParams {
  private final String filterId;

  public EthUninstallFilterRequestParams(String filterId) {
    this.filterId = filterId;
  }

  /**
   * An identifier used to reference the filter.
   */
  public String getFilterId() {
    return this.filterId;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Uninstalls a filter with given id. Should always be called when watch is no longer needed. Additionally Filters timeout when they aren't requested with eth_getFilterChanges for a period of time.
 * <p>As response: returns true if the filter was successfully uninstalled, false otherwise.</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class EthUninstallFilterResponse extends JsonRpcResponse<Boolean> {
  public EthUninstallFilterResponse(String id, boolean result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * The receipt of a transaction
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class SchemasReceipt {
  private final String blockHash;
  private final String blockNumber;
  private final String contractAddress;
  private final String cumulativeGasUsed;
  private final String from;
  private final String gasUsed;
  private final List<Log> logs;
  private final String logsBloom;
  private final String postTransactionState;
  private final boolean status;
  private final String to;
  private final String transactionHash;
  private final String transactionIndex;

  public SchemasReceipt(
    String blockHash,
    String blockNumber,
    String contractAddress,
    String cumulativeGasUsed,
    String from,
    String gasUsed,
    List<Log> logs,
    String logsBloom,
    String to,
    String transactionHash,
    String transactionIndex,
    String postTransactionState,
    boolean status
  ) {
    this.blockHash = blockHash;
    this.blockNumber = blockNumber;
    this.contractAddress = contractAddress;
    this.cumulativeGasUsed = cumulativeGasUsed;
    this.from = from;
    this.gasUsed = gasUsed;
    this.logs = logs;
    this.logsBloom = logsBloom;
    this.to = to;
    this.transactionHash = transactionHash;
    this.transactionIndex = transactionIndex;
    this.postTransactionState = postTransactionState;
    this.status = status;
  }

  /**
   * The hex representation of the Keccak 256 of the RLP encoded block<hr />
   * <strong>Example #1</strong> - nullExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#blockHash}</dt>
   *     <dd>"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"</dd>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getBlockHash() {
    return this.blockHash;
  }

  /**
   * The hex representation of the block's height<hr />
   * <strong>Example #1</strong> - nullResultExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#uncleBlockNumber}</dt>
   *     <dd>"0x0"</dd>
   *     <dt>{@link EthGetUncleByBlockNumberAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getBlockNumber() {
    return this.blockNumber;
  }

  /**
   * The contract address created, if the transaction was a contract creation, otherwise null
   */
  public String getContractAddress() {
    return this.contractAddress;
  }

  /**
   * The gas units used by the transaction
   */
  public String getCumulativeGasUsed() {
    return this.cumulativeGasUsed;
  }

  /**
   * The sender of the transaction
   */
  public String getFrom() {
    return this.from;
  }

  /**
   * The total gas used by the transaction
   */
  public String getGasUsed() {
    return this.gasUsed;
  }

  public List<Log> getLogs() {
    return this.logs;
  }

  /**
   * A 2048 bit bloom filter from the logs of the transaction. Each log sets 3 bits though taking the low-order 11 bits of each of the first three pairs of bytes in a Keccak 256 hash of the log's byte series
   */
  public String getLogsBloom() {
    return this.logsBloom;
  }

  /**
   * The intermediate stateRoot directly after transaction execution.
   */
  public String getPostTransactionState() {
    return this.postTransactionState;
  }

  /**
   * Whether or not the transaction threw an error.
   */
  public boolean isStatus() {
    return this.status;
  }

  /**
   * Destination address of the transaction. Null if it was a contract create.
   */
  public String getTo() {
    return this.to;
  }

  /**
   * Keccak 256 Hash of the RLP encoding of a transaction
   */
  public String getTransactionHash() {
    return this.transactionHash;
  }

  /**
   * The index of the transaction. null when its pending
   * <p>
   * Hex representation of the integer
   */
  public String getTransactionIndex() {
    return this.transactionIndex;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * The Block is the collection of relevant pieces of information (known as the block header), together with information corresponding to the comprised transactions, and a set of other block headers that are known to have a parent equal to the present block’s parent’s parent.
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class SchemasBlock {
  private final String difficulty;
  private final String extraData;
  private final String gasLimit;
  private final String gasUsed;
  private final String hash;
  private final String logsBloom;
  private final String miner;
  private final String nonce;
  private final String number;
  private final String parentHash;
  private final String receiptsRoot;
  private final String sha3Uncles;
  private final String size;
  private final String stateRoot;
  private final String timestamp;
  private final String totalDifficulty;
  private final List<TransactionOrTransactionHash> transactions;
  private final String transactionsRoot;
  private final List<String> uncles;

  public SchemasBlock(
    String number,
    String hash,
    String parentHash,
    String nonce,
    String sha3Uncles,
    String logsBloom,
    String transactionsRoot,
    String stateRoot,
    String receiptsRoot,
    String miner,
    String difficulty,
    String totalDifficulty,
    String extraData,
    String size,
    String gasLimit,
    String gasUsed,
    String timestamp,
    List<TransactionOrTransactionHash> transactions,
    List<String> uncles
  ) {
    this.number = number;
    this.hash = hash;
    this.parentHash = parentHash;
    this.nonce = nonce;
    this.sha3Uncles = sha3Uncles;
    this.logsBloom = logsBloom;
    this.transactionsRoot = transactionsRoot;
    this.stateRoot = stateRoot;
    this.receiptsRoot = receiptsRoot;
    this.miner = miner;
    this.difficulty = difficulty;
    this.totalDifficulty = totalDifficulty;
    this.extraData = extraData;
    this.size = size;
    this.gasLimit = gasLimit;
    this.gasUsed = gasUsed;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.uncles = uncles;
  }

  /**
   * Integer of the difficulty for this block
   */
  public String getDifficulty() {
    return this.difficulty;
  }

  /**
   * The 'extra data' field of this block
   */
  public String getExtraData() {
    return this.extraData;
  }

  /**
   * The maximum gas allowed in this block
   */
  public String getGasLimit() {
    return this.gasLimit;
  }

  /**
   * The total used gas by all transactions in this block
   */
  public String getGasUsed() {
    return this.gasUsed;
  }

  /**
   * The block hash or null when its the pending block
   * <p>
   * Hex representation of a Keccak 256 hash
   */
  public String getHash() {
    return this.hash;
  }

  /**
   * The bloom filter for the logs of the block or null when its the pending block
   */
  public String getLogsBloom() {
    return this.logsBloom;
  }

  public String getMiner() {
    return this.miner;
  }

  /**
   * Randomly selected number to satisfy the proof-of-work or null when its the pending block
   * <p>
   * A number only to be used once
   */
  public String getNonce() {
    return this.nonce;
  }

  /**
   * The block number or null when its the pending block
   * <p>
   * The hex representation of the block's height
   */
  public String getNumber() {
    return this.number;
  }

  /**
   * The hex representation of the Keccak 256 of the RLP encoded block<hr />
   * <strong>Example #1</strong> - nullExample
   * <p>
   *   <p><strong>📥 Request</strong>
   *   <dl>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#blockHash}</dt>
   *     <dd>"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"</dd>
   *     <dt>{@link EthGetTransactionByBlockHashAndIndexRequestParams#index}</dt>
   *     <dd>"0x0"</dd>
   *   </dl>
   *   </p>
   */
  public String getParentHash() {
    return this.parentHash;
  }

  /**
   * The root of the receipts trie of the block
   */
  public String getReceiptsRoot() {
    return this.receiptsRoot;
  }

  /**
   * Keccak hash of the uncles data in the block
   */
  public String getSha3Uncles() {
    return this.sha3Uncles;
  }

  /**
   * Integer the size of this block in bytes
   */
  public String getSize() {
    return this.size;
  }

  /**
   * The root of the final state trie of the block
   */
  public String getStateRoot() {
    return this.stateRoot;
  }

  /**
   * The unix timestamp for when the block was collated
   */
  public String getTimestamp() {
    return this.timestamp;
  }

  /**
   * Integer of the total difficulty of the chain until this block
   * <p>
   * Hex representation of the integer
   */
  public String getTotalDifficulty() {
    return this.totalDifficulty;
  }

  public List<TransactionOrTransactionHash> getTransactions() {
    return this.transactions;
  }

  /**
   * The root of the transactions trie of the block.
   */
  public String getTransactionsRoot() {
    return this.transactionsRoot;
  }

  public List<String> getUncles() {
    return this.uncles;
  }
}
