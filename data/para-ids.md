
## S1 — 1 Introduction

- S1.p1 :: Recurrent neural networks, long short-term memory [13] and gated recur
- S1.p1.1 :: Recurrent neural networks, long short-term memory [13] and gated recur
- S1.p2 :: Recurrent models typically factor computation along the symbol positio
- S1.p2.1 :: Recurrent models typically factor computation along the symbol positio
- S1.p3 :: Attention mechanisms have become an integral part of compelling sequen
- S1.p3.1 :: Attention mechanisms have become an integral part of compelling sequen
- S1.p4 :: In this work we propose the Transformer, a model architecture eschewin
- S1.p4.1 :: In this work we propose the Transformer, a model architecture eschewin

## S2 — 2 Background

- S2.p1 :: The goal of reducing sequential computation also forms the foundation 
- S2.p1.1 :: The goal of reducing sequential computation also forms the foundation 
- S2.p2 :: Self-attention, sometimes called intra-attention is an attention mecha
- S2.p2.1 :: Self-attention, sometimes called intra-attention is an attention mecha
- S2.p3 :: End-to-end memory networks are based on a recurrent attention mechanis
- S2.p3.1 :: End-to-end memory networks are based on a recurrent attention mechanis
- S2.p4 :: To the best of our knowledge, however, the Transformer is the first tr
- S2.p4.1 :: To the best of our knowledge, however, the Transformer is the first tr

## S3 — 3 Model Architecture

- S3.F1 :: Figure 1: The Transformer - model architecture.
- S3.p1 :: Most competitive neural sequence transduction models have an encoder-d
- S3.p1.1 :: Most competitive neural sequence transduction models have an encoder-d
- S3.p2 :: The Transformer follows this overall architecture using stacked self-a
- S3.p2.1 :: The Transformer follows this overall architecture using stacked self-a
- S3.SS1.SSS0.Px1.p1 :: The encoder is composed of a stack of N=6N=6 identical layers. Each la
- S3.SS1.SSS0.Px1.p1.1 :: The encoder is composed of a stack of N=6N=6 identical layers. Each la
- S3.SS1.SSS0.Px2.p1 :: The decoder is also composed of a stack of N=6N=6 identical layers. In
- S3.SS1.SSS0.Px2.p1.1 :: The decoder is also composed of a stack of N=6N=6 identical layers. In
- S3.SS2.p1 :: An attention function can be described as mapping a query and a set of
- S3.SS2.p1.1 :: An attention function can be described as mapping a query and a set of
- S3.SS2.SSS1.p1 :: We call our particular attention "Scaled Dot-Product Attention" (Figur
- S3.SS2.SSS1.p1.1 :: We call our particular attention "Scaled Dot-Product Attention" (Figur
- S3.SS2.SSS1.p2 :: In practice, we compute the attention function on a set of queries sim
- S3.SS2.SSS1.p2.1 :: In practice, we compute the attention function on a set of queries sim
- S3.SS2.SSS1.p3 :: Attention⁡(Q,K,V)=softmax⁡(Q​KTdk)​V\mathrm{Attention}(Q,K,V)=\mathrm{
- S3.E1 :: Attention⁡(Q,K,V)=softmax⁡(Q​KTdk)​V\mathrm{Attention}(Q,K,V)=\mathrm{
- S3.SS2.SSS1.p4 :: The two most commonly used attention functions are additive attention 
- S3.SS2.SSS1.p4.1 :: The two most commonly used attention functions are additive attention 
- S3.SS2.SSS1.p5 :: While for small values of dkd_{k} the two mechanisms perform similarly
- S3.SS2.SSS1.p5.1 :: While for small values of dkd_{k} the two mechanisms perform similarly
- S3.F2 :: Scaled Dot-Product Attention Multi-Head Attention Figure 2: (left) Sca
- S3.F2.2 :: Scaled Dot-Product Attention
- S3.F2.2.1 :: Scaled Dot-Product Attention
- S3.F2.3 :: Multi-Head Attention
- S3.F2.3.1 :: Multi-Head Attention
- S3.SS2.SSS2.p1 :: Instead of performing a single attention function with dmodeld_{\text{
- S3.SS2.SSS2.p1.1 :: Instead of performing a single attention function with dmodeld_{\text{
- S3.SS2.SSS2.p2 :: Multi-head attention allows the model to jointly attend to information
- S3.SS2.SSS2.p2.1 :: Multi-head attention allows the model to jointly attend to information
- S3.SS2.SSS2.p3 :: MultiHead⁡(Q,K,V)\displaystyle\mathrm{MultiHead}(Q,K,V) =Concat⁡(head1
- S3.EGx1 :: MultiHead⁡(Q,K,V)\displaystyle\mathrm{MultiHead}(Q,K,V) =Concat⁡(head1
- S3.SS2.SSS2.p4 :: Where the projections are parameter matrices WiQ∈ℝdmodel×dkW^{Q}_{i}\i
- S3.SS2.SSS2.p4.1 :: Where the projections are parameter matrices WiQ∈ℝdmodel×dkW^{Q}_{i}\i
- S3.SS2.SSS2.p5 :: In this work we employ h=8h=8 parallel attention layers, or heads. For
- S3.SS2.SSS2.p5.1 :: In this work we employ h=8h=8 parallel attention layers, or heads. For
- S3.SS2.SSS3.p1 :: The Transformer uses multi-head attention in three different ways: • I
- S3.SS2.SSS3.p1.1 :: The Transformer uses multi-head attention in three different ways:
- S3.I1.i1.p1 :: In "encoder-decoder attention" layers, the queries come from the previ
- S3.I1.i1.p1.1 :: In "encoder-decoder attention" layers, the queries come from the previ
- S3.I1.i2.p1 :: The encoder contains self-attention layers. In a self-attention layer 
- S3.I1.i2.p1.1 :: The encoder contains self-attention layers. In a self-attention layer 
- S3.I1.i3.p1 :: Similarly, self-attention layers in the decoder allow each position in
- S3.I1.i3.p1.1 :: Similarly, self-attention layers in the decoder allow each position in
- S3.SS3.p1 :: In addition to attention sub-layers, each of the layers in our encoder
- S3.SS3.p1.1 :: In addition to attention sub-layers, each of the layers in our encoder
- S3.SS3.p2 :: FFN⁡(x)=max⁡(0,x​W1+b1)​W2+b2\mathrm{FFN}(x)=\max(0,xW_{1}+b_{1})W_{2}
- S3.E2 :: FFN⁡(x)=max⁡(0,x​W1+b1)​W2+b2\mathrm{FFN}(x)=\max(0,xW_{1}+b_{1})W_{2}
- S3.SS3.p3 :: While the linear transformations are the same across different positio
- S3.SS3.p3.1 :: While the linear transformations are the same across different positio
- S3.SS4.p1 :: Similarly to other sequence transduction models, we use learned embedd
- S3.SS4.p1.1 :: Similarly to other sequence transduction models, we use learned embedd
- S3.SS5.p1 :: Since our model contains no recurrence and no convolution, in order fo
- S3.SS5.p1.1 :: Since our model contains no recurrence and no convolution, in order fo
- S3.SS5.p2 :: In this work, we use sine and cosine functions of different frequencie
- S3.SS5.p2.1 :: In this work, we use sine and cosine functions of different frequencie
- S3.SS5.p3 :: P​E(p​o​s,2​i)=s​i​n​(p​o​s/100002​i/dmodel)\displaystyle PE_{(pos,2i)
- S3.EGx2 :: P​E(p​o​s,2​i)=s​i​n​(p​o​s/100002​i/dmodel)\displaystyle PE_{(pos,2i)
- S3.SS5.p4 :: where p​o​spos is the position and ii is the dimension. That is, each 
- S3.SS5.p4.1 :: where p​o​spos is the position and ii is the dimension. That is, each 
- S3.SS5.p5 :: We also experimented with using learned positional embeddings [9] inst
- S3.SS5.p5.1 :: We also experimented with using learned positional embeddings [9] inst

## S4 — 4 Why Self-Attention

- S4.p1 :: In this section we compare various aspects of self-attention layers to
- S4.p1.1 :: In this section we compare various aspects of self-attention layers to
- S4.p2 :: One is the total computational complexity per layer. Another is the am
- S4.p2.1 :: One is the total computational complexity per layer. Another is the am
- S4.p3 :: The third is the path length between long-range dependencies in the ne
- S4.p3.1 :: The third is the path length between long-range dependencies in the ne
- S4.T1 :: Table 1: Maximum path lengths, per-layer complexity and minimum number
- S4.T1.2 :: Layer Type Complexity per Layer Sequential Maximum Path Length Operati
- S4.p4 :: As noted in Table 1, a self-attention layer connects all positions wit
- S4.p4.1 :: As noted in Table 1, a self-attention layer connects all positions wit
- S4.p5 :: A single convolutional layer with kernel width k<nk<n does not connect
- S4.p5.1 :: A single convolutional layer with kernel width k<nk<n does not connect
- S4.p6 :: As side benefit, self-attention could yield more interpretable models.
- S4.p6.1 :: As side benefit, self-attention could yield more interpretable models.

## S5 — 5 Training

- S5.p1 :: This section describes the training regime for our models.
- S5.p1.1 :: This section describes the training regime for our models.
- S5.SS1.p1 :: We trained on the standard WMT 2014 English-German dataset consisting 
- S5.SS1.p1.1 :: We trained on the standard WMT 2014 English-German dataset consisting 
- S5.SS2.p1 :: We trained our models on one machine with 8 NVIDIA P100 GPUs. For our 
- S5.SS2.p1.1 :: We trained our models on one machine with 8 NVIDIA P100 GPUs. For our 
- S5.SS3.p1 :: We used the Adam optimizer [20] with β1=0.9\beta_{1}=0.9, β2=0.98\beta
- S5.SS3.p1.1 :: We used the Adam optimizer [20] with β1=0.9\beta_{1}=0.9, β2=0.98\beta
- S5.SS3.p2 :: l​r​a​t​e=dmodel−0.5⋅min⁡(s​t​e​p​_​n​u​m−0.5,s​t​e​p​_​n​u​m⋅w​a​r​m​
- S5.E3 :: l​r​a​t​e=dmodel−0.5⋅min⁡(s​t​e​p​_​n​u​m−0.5,s​t​e​p​_​n​u​m⋅w​a​r​m​
- S5.SS3.p3 :: This corresponds to increasing the learning rate linearly for the firs
- S5.SS3.p3.1 :: This corresponds to increasing the learning rate linearly for the firs
- S5.SS4.p1 :: We employ three types of regularization during training:
- S5.SS4.p1.1 :: We employ three types of regularization during training:
- S5.SS4.SSS0.Px1.p1 :: We apply dropout [33] to the output of each sub-layer, before it is ad
- S5.SS4.SSS0.Px1.p1.1 :: We apply dropout [33] to the output of each sub-layer, before it is ad
- S5.SS4.SSS0.Px2.p1 :: During training, we employed label smoothing of value ϵl​s=0.1\epsilon
- S5.SS4.SSS0.Px2.p1.1 :: During training, we employed label smoothing of value ϵl​s=0.1\epsilon

## S6 — 6 Results

- S6.T2 :: Table 2: The Transformer achieves better BLEU scores than previous sta
- S6.T2.2 :: Model BLEU Training Cost (FLOPs) EN-DE EN-FR EN-DE EN-FR ByteNet [18] 
- S6.SS1.p1 :: On the WMT 2014 English-to-German translation task, the big transforme
- S6.SS1.p1.1 :: On the WMT 2014 English-to-German translation task, the big transforme
- S6.SS1.p2 :: On the WMT 2014 English-to-French translation task, our big model achi
- S6.SS1.p2.1 :: On the WMT 2014 English-to-French translation task, our big model achi
- S6.SS1.p3 :: For the base models, we used a single model obtained by averaging the 
- S6.SS1.p3.1 :: For the base models, we used a single model obtained by averaging the 
- S6.SS1.p4 :: Table 2 summarizes our results and compares our translation quality an
- S6.SS1.p4.1 :: Table 2 summarizes our results and compares our translation quality an
- S6.T3 :: Table 3: Variations on the Transformer architecture. Unlisted values a
- S6.T3.2 :: NN dmodeld_{\text{model}} dffd_{\text{ff}} hh dkd_{k} dvd_{v} Pd​r​o​p
- S6.SS2.p1 :: To evaluate the importance of different components of the Transformer,
- S6.SS2.p1.1 :: To evaluate the importance of different components of the Transformer,
- S6.SS2.p2 :: In Table 3 rows (A), we vary the number of attention heads and the att
- S6.SS2.p2.1 :: In Table 3 rows (A), we vary the number of attention heads and the att
- S6.SS2.p3 :: In Table 3 rows (B), we observe that reducing the attention key size d
- S6.SS2.p3.1 :: In Table 3 rows (B), we observe that reducing the attention key size d
- S6.T4 :: Table 4: The Transformer generalizes well to English constituency pars
- S6.T4.2 :: Parser Training WSJ 23 F1 Vinyals & Kaiser el al. (2014) [37] WSJ only
- S6.SS3.p1 :: To evaluate if the Transformer can generalize to other tasks we perfor
- S6.SS3.p1.1 :: To evaluate if the Transformer can generalize to other tasks we perfor
- S6.SS3.p2 :: We trained a 4-layer transformer with dm​o​d​e​l=1024d_{model}=1024 on
- S6.SS3.p2.1 :: We trained a 4-layer transformer with dm​o​d​e​l=1024d_{model}=1024 on
- S6.SS3.p3 :: We performed only a small number of experiments to select the dropout,
- S6.SS3.p3.1 :: We performed only a small number of experiments to select the dropout,
- S6.SS3.p4 :: Our results in Table 4 show that despite the lack of task-specific tun
- S6.SS3.p4.1 :: Our results in Table 4 show that despite the lack of task-specific tun
- S6.SS3.p5 :: In contrast to RNN sequence-to-sequence models [37], the Transformer o
- S6.SS3.p5.1 :: In contrast to RNN sequence-to-sequence models [37], the Transformer o

## S7 — 7 Conclusion

- S7.p1 :: In this work, we presented the Transformer, the first sequence transdu
- S7.p1.1 :: In this work, we presented the Transformer, the first sequence transdu
- S7.p2 :: For translation tasks, the Transformer can be trained significantly fa
- S7.p2.1 :: For translation tasks, the Transformer can be trained significantly fa
- S7.p3 :: We are excited about the future of attention-based models and plan to 
- S7.p3.1 :: We are excited about the future of attention-based models and plan to 
- S7.p4 :: The code we used to train and evaluate our models is available at http
- S7.p4.1 :: The code we used to train and evaluate our models is available at http
- S7.SS0.SSS0.Px1.p1 :: We are grateful to Nal Kalchbrenner and Stephan Gouws for their fruitf
- S7.SS0.SSS0.Px1.p1.1 :: We are grateful to Nal Kalchbrenner and Stephan Gouws for their fruitf

## bib — References


## Sx1 — Attention Visualizations

- Sx1.F3 :: Figure 3: An example of the attention mechanism following long-distanc
- Sx1.F4 :: Figure 4: Two attention heads, also in layer 5 of 6, apparently involv
- Sx1.F5 :: Figure 5: Many of the attention heads exhibit behaviour that seems rel
