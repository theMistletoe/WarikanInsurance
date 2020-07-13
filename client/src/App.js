import React, { Component } from "react";
import InsuranceFactoryContract from "./contracts/InsuranceFactory.json";
import WarikanInsuranceContract from "./contracts/WarikanInsurance.json";
import getWeb3 from "./getWeb3";

import "./App.css";

class App extends Component {
  state = { 
    InsuranceFactoryAddress: '',
    web3: null,
    accounts: null,
    deployedNetwork: null,
    InsuranceFactory: null,
    WarikanInsurance: null,
    AddressMapperaddress: '',
    owningInsurace: '',
    allInsurances: [],
    selectedInsurence: '0x0000000000000000000000000000000000000000', // dummy address
    participants: [],
    amount: 0,
    PooledDeposit: 0,
    RefundTarget: '',
    hasBeenBuiltConsensus: false,
  };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = InsuranceFactoryContract.networks[networkId];

      const InsuranceFactoryContractInstance = new web3.eth.Contract(
        InsuranceFactoryContract.abi,
        deployedNetwork && deployedNetwork.address,
      );

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({
        web3,
        accounts,
        deployedNetwork,
        InsuranceFactory: InsuranceFactoryContractInstance},
      this.fetchInsuranceFactoryAddress);

      this.fetchAllInfos();
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  setInsuranceInstance = async () => {
    // console.log(this.state.selectedInsurence);

    const WarikanInsuranceContractInstance = new this.state.web3.eth.Contract(
      WarikanInsuranceContract.abi,
      this.state.deployedNetwork && this.state.selectedInsurence,
    );

    this.setState({WarikanInsurance: WarikanInsuranceContractInstance });
  };

  // if you add fetch func, add that in below func.
  fetchAllInfos = async () => {
    await this.setInsuranceInstance();

    await this.fetchOwningInsurace();
    await this.fetchDeployedAllInsurances();

    if (this.state.selectedInsurence !== '0x0000000000000000000000000000000000000000'){
      await this.fetchTargetInsuraceParticipants();
      await this.fetchPooledDeposit();
      await this.fetchRefundTarget();
      await this.fetchConsensusResult();
    }
  };

  fetchInsuranceFactoryAddress = async () => {
    const { InsuranceFactory } = this.state;

    // Get the value from the contract to prove it worked.
    const response = await InsuranceFactory.methods.owner().call();

    // Update state with the result.
    this.setState({ InsuranceFactoryAddress: response });
  };

  fetchOwningInsurace = async () => {
    const { accounts, InsuranceFactory } = this.state;

    const response = await InsuranceFactory.methods.insurances(accounts[0]).call();

    this.setState({ owningInsurace: response })
  };

  
  fetchDeployedAllInsurances = async () => {
    const allInsurances = [];
    const { InsuranceFactory } = this.state;
    
    await InsuranceFactory.getPastEvents('Created', {
      filter: { myIndexedParam: [20, 23], myOtherIndexedParam: '0x123456789...' }, // Using an array means OR: e.g. 20 or 23
      fromBlock: 0,
      toBlock: 'latest'
    }, (error, events) => {
      events.map(event => {
        allInsurances.push(event.returnValues.insurance);
      });
    });
    
    this.setState({ allInsurances: allInsurances });

    // ここクソやな
    if(
      this.state.selectedInsurence === '0x0000000000000000000000000000000000000000' && 
      allInsurances.length > 0
    ){      
      await this.setState({selectedInsurence: allInsurances[allInsurances.length - 1]});
    }
  };
  
  handleChange = name => event => {
    this.setState({ [name]: event.target.value });
  };
  
  setAddressMapper = async () => {
    const { accounts, InsuranceFactory } = this.state;
    const res = await InsuranceFactory.methods.setAddressMapper(this.state.AddressMapperaddress).send({ from: accounts[0] });
    // console.log(res);
  };
  
  createInsurance = async () => {
    const { accounts, InsuranceFactory } = this.state;
    const res = await InsuranceFactory.methods.createInsurance().send({ from: accounts[0] });
    // console.log(res);
    this.fetchOwningInsurace();
  };

  updateSelectedInsurence = async (event) => {
    await this.setState({selectedInsurence: event.target.value});
    await this.fetchAllInfos();
  }

  fetchTargetInsuraceParticipants = async () => {
    const participants = [];
    this.setInsuranceInstance();
    const { WarikanInsurance } = this.state;

    const response = await WarikanInsurance.methods.getParticipants().call();
    // console.log(response); // ok 

    response.forEach(function( participantAddress ) {
      participants.push(participantAddress);
    });
    // console.log(participants);
    

    // Update state with the result.
    this.setState({ participants });
  };

  joinToInsurance = async () => {
    this.setInsuranceInstance();
    const { accounts, WarikanInsurance } = this.state;

    const response = await WarikanInsurance.methods.joinToInsurance().send({ from: accounts[0] });
    // console.log(response);
    this.fetchTargetInsuraceParticipants();
  };

  poolDeposit = async () => {
    this.setInsuranceInstance();
    const { accounts, WarikanInsurance, amount } = this.state;
    // console.log(amount);

    const response = await WarikanInsurance.methods.poolDeposit().send({ 
      from: accounts[0],
      value: Number(amount) * (10 ** 18) * (2 / 5) // about 10,000 Yen
    });
    // console.log(response);
    this.fetchPooledDeposit();
  };

  fetchPooledDeposit = async () => {
    this.setInsuranceInstance();
    const { WarikanInsurance } = this.state;

    const PooledDeposit = await WarikanInsurance.methods.depositTotalAmount().call();

    this.setState({ PooledDeposit });
  };

  fetchRefundTarget = async () => {
    this.setInsuranceInstance();
    const { WarikanInsurance } = this.state;

    const RefundTarget = await WarikanInsurance.methods.refundTarget().call();

    this.setState({ RefundTarget });
  };

  challengeRefund = async () => {
    this.setInsuranceInstance();
    const { accounts, WarikanInsurance } = this.state;

    const response = await WarikanInsurance.methods.challengeRefund().send({ 
      from: accounts[0]
    });
    console.log(response);
    this.fetchAllInfos();
  };

  approveChallenge = async () => {
    this.setInsuranceInstance();
    const { accounts, WarikanInsurance } = this.state;

    const response = await WarikanInsurance.methods.approveChallenge().send({ 
      from: accounts[0]
    });
    console.log(response);
    this.fetchAllInfos();
  };

  fetchConsensusResult = async () => {
    this.setInsuranceInstance();
    const { WarikanInsurance } = this.state;

    const hasBeenBuiltConsensus = await WarikanInsurance.methods.hasBeenBuiltConsensus().call();
    console.log(hasBeenBuiltConsensus);
    
    
    this.setState({ hasBeenBuiltConsensus });
  };

  withdrawDepositedAmout = async () => {
    this.setInsuranceInstance();
    const { accounts, WarikanInsurance } = this.state;

    const response = await WarikanInsurance.methods.withdraw().send({ 
      from: accounts[0]
    });
    console.log(response);

    this.fetchAllInfos();
  };

  requireAssessment = async () => {
    this.setInsuranceInstance();
    const { accounts, WarikanInsurance } = this.state;

    const response = await WarikanInsurance.methods.requireAssessment().send({ 
      from: accounts[0]
    });
    console.log(response);

    this.fetchAllInfos();
  } 

  fetchAssessmentResult = async () => {
    this.setInsuranceInstance();
    const { web3, accounts, WarikanInsurance } = this.state;

    const response = await WarikanInsurance.methods.fetchAssessmentResult_().send({ 
      from: accounts[0],
      value: web3.utils.toWei('0.000175', 'ether'),
      gas: '3000000',
    });
    console.log(response);

    this.fetchAllInfos();
  };

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
        <h1>みんなでLet's Warikan!!!</h1>
        {/* <p>Your Truffle Box is installed and ready.</p>
        <h2>Smart Contract Example</h2>
        <p>
          If your contracts compiled and migrated successfully, below will show
          a stored value of 5 (by default).
        </p>
        <p>
          Try changing the value stored on <strong>line 40</strong> of App.js.
        </p> */}
        <div>あなたのアドレス: {this.state.accounts[0].toLowerCase()}</div>
        <div>InsuranceFactoryのアドレス: {this.state.InsuranceFactoryAddress.toLowerCase()}</div>
        <hr />
        <div>全ての保険</div>
        <div>
          {this.state.allInsurances.map((insurance, i) => {
            return (
              <div key={i}>
                <div>保険アドレス{i+1}：{insurance.toLowerCase()}</div>
              </div>
            )
          })}
        </div>
        <hr />
        <div>  
          <input
            id="AddressMapperaddress"
            label="AddressMapperaddress"
            onChange={this.handleChange('AddressMapperaddress')}
            placeholder="set AddressMapper's contract address"
            />
        </div>
        <div>
          <button onClick={this.setAddressMapper}>
            AddressMapperをセット(多分Factory生成時に1回だけ必要)
          </button>
        </div>
        <hr />
        <div>
          <button onClick={this.createInsurance}>
            保険を作る!
          </button>
        </div>
        <div>
          あなたの保有する保険アドレス:{this.state.owningInsurace.toLowerCase()}
        </div>
        <hr />
        <div>処理対象保険</div>
        <select
          value={this.state.selectedInsurence}
          onChange={ e => {this.updateSelectedInsurence(e)} }>
          {this.state.allInsurances.map((insurance, i) => {
            return (
              <option key={i} value={insurance}>{insurance.toLowerCase()}</option>
            )
          })}
        </select>
        <div>
          <button onClick={this.joinToInsurance}>
            保険に参加する!
          </button>
        </div>
        <div>参加者リスト</div>
        <div>
          {this.state.participants.map((participantAddress, i) => {
            return (
              <div key={i}>
                <div>参加者のアドレス{i+1}：{participantAddress.toLowerCase()}</div>
              </div>
            )
          })}
        </div>
        <hr />
        <div>  
          <input
            id="amount"
            label="amount"
            onChange={this.handleChange('amount')}
            placeholder="pool amount(ex:'1'万円)"
            />
        </div>
        <div>
          <button onClick={this.poolDeposit}>
            保険料をプールする
          </button>
        </div>
        <div>プールされた保険料:約{Number(this.state.PooledDeposit)/400000000000000000}万円</div>
        <hr />
        <div>請求者:{this.state.RefundTarget.toLowerCase()}</div>
        <div>
          <button onClick={this.challengeRefund}>
            請求をチャレンジする
          </button>
        </div>
        <div>
          <button onClick={this.approveChallenge}>
            請求を承認する
          </button>
        </div>
        <div>全員の承認が得られたか?:{this.state.hasBeenBuiltConsensus.toString()}</div>
        <div>
          <button onClick={this.withdrawDepositedAmout}>
            保険金を引き出す
          </button>
        </div>
        <hr />
        <div>
          <button onClick={this.requireAssessment}>
            査定を依頼する
          </button>
        </div>
        <div>
          <button onClick={this.fetchAssessmentResult}>
            査定結果を取得する(only reposten network?)
          </button>
        </div>
      </div>
    );
  }
}

export default App;
